/**
 * ChatMessage 컴포넌트
 *
 * 채팅 메시지 단위를 렌더링합니다.
 * - user: 오른쪽 정렬, 인디고 그라디언트 말풍선
 * - ai: 왼쪽 정렬, 흰색 카드 + 봇 아바타
 * - 스트리밍 중에는 깜빡이는 커서 표시
 * - 출처 게시글 ID를 링크로 렌더링
 */

import React from "react";
import Link from "next/link";
import { Bot, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface Props {
  message: ChatMessageType;
}

// ─── ISO 날짜 포매터 ───────────────────────────────────────────────────────────
/**
 * ISO 8601 날짜 문자열을 사용자 친화적 형식으로 변환합니다.
 * 예) "2026-03-07T22:29:33.925241" → "2026년 3월 7일 오후 10:29"
 */
function formatDateString(isoString: string): string {
  try {
    // 마이크로초(6자리)는 JS Date가 지원하지 않으므로 밀리초(3자리)로 잘라냄
    const normalized = isoString.replace(/(\.\d{3})\d+/, "$1");
    return format(parseISO(normalized), "yyyy년 M월 d일 a h:mm", {
      locale: ko,
    });
  } catch {
    return isoString; // 파싱 실패 시 원문 그대로 반환
  }
}

// ─── 인라인 마크다운 + 날짜 렌더러 ────────────────────────────────────────────
/**
 * 텍스트에서 다음 두 가지 패턴을 감지해 변환합니다.
 * 1. **bold** → <strong>
 * 2. ISO 8601 날짜 → 사용자 친화적 날짜 문자열 (date-fns)
 *
 * whitespace-pre-wrap으로 줄바꿈은 CSS가 처리합니다.
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  // bold와 ISO 날짜를 하나의 정규식으로 토큰화
  const TOKEN_RE =
    /(\*\*[^*]+\*\*|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)/g;
  const parts = text.split(TOKEN_RE);

  return parts.map((part, i) => {
    // **bold** 처리
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // ISO 날짜 처리 (T가 포함된 날짜 패턴)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(part)) {
      return (
        <time
          key={i}
          dateTime={part}
          className="text-purple-500 font-medium"
          title={part} // 원본 ISO 값을 툴팁으로 제공
        >
          {formatDateString(part)}
        </time>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2 items-end", isUser && "flex-row-reverse")}>
      {/* 아바타 */}
      <div
        className={cn(
          "shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm",
          isUser
            ? "bg-purple-600 text-white"
            : "bg-linear-to-br from-indigo-500 to-purple-600 text-white",
        )}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* 말풍선 영역 */}
      <div
        className={cn(
          "max-w-[78%] flex flex-col gap-1.5",
          isUser && "items-end",
        )}
      >
        {/* 말풍선 */}
        <div
          className={cn(
            "px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word",
            isUser
              ? // 사용자 메시지: 오른쪽 아래 모서리만 직각
                "bg-purple-600 text-white rounded-2xl rounded-br-sm shadow-md shadow-purple-200"
              : // AI 메시지: 왼쪽 아래 모서리만 직각
                "bg-white border border-purple-100 text-gray-800 rounded-2xl rounded-bl-sm shadow-sm",
          )}
        >
          {/* 마크다운 렌더링 + pre-wrap으로 줄바꿈 보존 */}
          <p className="whitespace-pre-wrap">
            {renderInlineMarkdown(message.content)}

            {/* 스트리밍 중 깜빡이는 커서 */}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 align-middle animate-pulse" />
            )}
          </p>
        </div>

        {/* 출처 게시글 링크 (스트리밍 완료 + 출처 있을 때만 표시) */}
        {!message.isStreaming &&
          message.sourcePostIds &&
          message.sourcePostIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-gray-400">출처:</span>
              {message.sourcePostIds.map((id) => (
                <Link
                  key={id}
                  href={`/post/${id}`}
                  className="text-[11px] text-purple-500 hover:text-purple-700 hover:underline transition-colors font-medium"
                >
                  #{id}
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
