"use client";

/**
 * ChatbotWindow 컴포넌트
 *
 * RAG 챗봇 채팅 창입니다.
 * - SSE 스트리밍으로 AI 응답을 실시간 렌더링
 * - textarea 자동 높이 조절
 * - 메시지 추가 시 자동 스크롤
 * - Enter 전송 / Shift+Enter 줄바꿈
 * - 스트리밍 중 입력 비활성화 + 로딩 인디케이터
 */

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { streamChat } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import ChatMessageComponent from "./ChatMessage";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

/** 챗봇이 처음 보내는 환영 메시지 */
const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "ai",
  content:
    "안녕하세요! 저는 커뮤니티 AI 어시스턴트예요 ✨\n\n" +
    "이 커뮤니티의 게시글을 기반으로 궁금한 점을 답해드릴게요.\n" +
    "어떤 주제가 궁금하신가요?",
  sourcePostIds: [],
};

/** 타이핑 인디케이터용 3점 점프 애니메이션 */
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      {/* AI 아바타 */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
        <Sparkles size={12} className="text-white" />
      </div>
      {/* 점프 점 3개 */}
      <div className="bg-white border border-purple-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-400"
              style={{
                animation: "chatbotDotBounce 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function ChatbotWindow({ onClose }: Props) {
  // 메시지 목록
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  // 입력 텍스트
  const [input, setInput] = useState("");
  // 스트리밍 진행 중 (연속 전송 방지)
  const [isStreaming, setIsStreaming] = useState(false);
  // 스트리밍 시작됐지만 첫 토큰 전 (타이핑 인디케이터 표시 용도)
  const [isPending, setIsPending] = useState(false);

  // DOM 참조
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 고유 ID prefix (React 18 hydration 안전)
  const idPrefix = useId();
  const genId = useCallback(
    () => `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    [idPrefix],
  );

  // ─── 메시지 끝으로 자동 스크롤 ────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending, scrollToBottom]);

  // ─── textarea 높이 자동 조절 ───────────────────────────────────────────────

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  // ─── 메시지 전송 핸들러 ────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || isStreaming) return;

    setInput("");
    setIsStreaming(true);
    setIsPending(true); // 타이핑 인디케이터 표시

    // 1. 사용자 메시지 즉시 추가
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: query,
    };

    // 2. AI 응답 메시지 (내용 없이 스트리밍 중 표시)
    const aiMsgId = genId();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: "ai",
      content: "",
      sourcePostIds: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg]);

    // 스트리밍 API 호출
    // aiMsg, aiMsgId 는 핸들러 내부에서 생성된 로컬 변수 → 클로저로 정상 캡처됨
    await streamChat(query, 5, {
      /** metadata 이벤트: 출처 게시글 ID 수신 → AI 메시지 등록 */
      onMetadata: (sourcePostIds) => {
        setIsPending(false); // 타이핑 인디케이터 제거 후 메시지 버블 등록
        setMessages((prev) => [...prev, { ...aiMsg, sourcePostIds }]);
      },

      /** token 이벤트: 토큰 단위로 내용 누적 */
      onToken: (token) => {
        setIsPending(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, content: msg.content + token } : msg,
          ),
        );
      },

      /** done 이벤트: 스트리밍 완료 → 커서 제거 */
      onDone: () => {
        setIsPending(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg,
          ),
        );
        setIsStreaming(false);
      },

      /** 오류 처리: 오류 메시지로 대체 */
      onError: (error) => {
        console.error("[ChatbotWindow] 스트리밍 오류:", error);
        setIsPending(false);
        setMessages((prev) => {
          // AI 메시지가 이미 추가된 경우 내용을 오류 메시지로 교체
          const hasAiMsg = prev.some((msg) => msg.id === aiMsgId);
          if (hasAiMsg) {
            return prev.map((msg) =>
              msg.id === aiMsgId
                ? {
                    ...msg,
                    content:
                      "죄송해요, 응답 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
                    isStreaming: false,
                  }
                : msg,
            );
          }
          // 아직 AI 메시지가 없으면 새로 추가
          return [
            ...prev,
            {
              ...aiMsg,
              content:
                "죄송해요, 응답 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
              isStreaming: false,
            },
          ];
        });
        setIsStreaming(false);
      },
    });
  }, [input, isStreaming, genId]); // aiMsg/aiMsgId 는 handleSend 내부 로컬 변수

  // ─── 키보드 이벤트: Enter 전송 / Shift+Enter 줄바꿈 ──────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ─── 렌더링 ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* dot bounce 키프레임 (전역 style 삽입) */}
      <style>{`
        @keyframes chatbotDotBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
      `}</style>

      <div
        className={cn(
          "w-80 sm:w-88 h-125 flex flex-col",
          "bg-white/95 backdrop-blur-xl",
          "border border-purple-100 rounded-2xl",
          "shadow-2xl shadow-purple-200/40",
          "overflow-hidden",
        )}
      >
        {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-linear-to-r from-purple-600 to-indigo-600 text-white">
          {/* AI 아이콘 */}
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={16} />
          </div>

          {/* 타이틀 + 상태 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              커뮤니티 AI 어시스턴트
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  isStreaming ? "bg-yellow-300 animate-pulse" : "bg-green-400",
                )}
              />
              <p className="text-[11px] text-white/75">
                {isStreaming ? "답변 생성 중..." : "RAG 기반 게시글 검색"}
              </p>
            </div>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="챗봇 닫기"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── 메시지 목록 ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-linear-to-b from-indigo-50/40 to-white/60">
          {messages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))}

          {/* 타이핑 인디케이터: metadata 도착 전 */}
          {isPending && <TypingIndicator />}

          {/* 자동 스크롤 앵커 */}
          <div ref={messagesEndRef} />
        </div>

        {/* ── 입력 영역 ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-purple-100/80 bg-white/90 px-3 py-3">
          {/* 입력 박스 */}
          <div
            className={cn(
              "flex items-end gap-2",
              "bg-white rounded-xl border transition-colors px-3 py-2",
              isStreaming
                ? "border-gray-200"
                : "border-purple-200 focus-within:border-purple-500",
            )}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? "답변을 생성하는 중이에요..."
                  : "질문을 입력하세요..."
              }
              disabled={isStreaming}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent text-sm text-gray-800",
                "placeholder-gray-400 outline-none",
                "min-h-6 max-h-24",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            />

            {/* 전송 버튼 */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                "transition-all duration-150",
                input.trim() && !isStreaming
                  ? "bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 shadow-md shadow-purple-300/50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
              aria-label="메시지 전송"
            >
              <Send size={15} />
            </button>
          </div>

          {/* 힌트 텍스트 */}
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            Shift+Enter 줄바꿈 · 커뮤니티 게시글 기반 답변
          </p>
        </div>
      </div>
    </>
  );
}
