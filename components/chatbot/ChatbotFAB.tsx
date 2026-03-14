"use client";

/**
 * ChatbotFAB (Floating Action Button) 컴포넌트
 *
 * 로그인 이후의 모든 페이지에 표시되는 플로팅 챗봇 버튼입니다.
 * - 비로그인 상태에서는 렌더링하지 않음
 * - 클릭 시 ChatbotWindow 슬라이드업 애니메이션으로 표시
 * - 위치: Navigation 바로 위 (bottom-20, z-40)
 * - 로딩 완료 후 animate-float 효과
 */

import React, { useState, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import ChatbotWindow from "./ChatbotWindow";

export default function ChatbotFAB() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  // 인증 로딩 중이거나 비로그인 상태에서는 렌더링하지 않음
  if (isLoading || !isAuthenticated) return null;

  return (
    // FAB + 창을 함께 감싸는 고정 컨테이너
    // pointer-events-none: 컨테이너 자체는 클릭 이벤트를 차단하지 않음
    // 자식 요소에서 필요할 때만 pointer-events-auto로 활성화
    // bottom-20: Navigation 높이(h-16=4rem) 위 추가 여백, z-40: Navigation(z-50) 아래
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
      {/* ── 챗봇 창 (슬라이드업 + 페이드인) ─────────────────────────────────── */}
      <div
        className={cn(
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-3 pointer-events-none",
        )}
        aria-hidden={!isOpen}
      >
        <ChatbotWindow onClose={handleClose} />
      </div>

      {/* ── FAB 버튼 ──────────────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        className={cn(
          // 컨테이너가 pointer-events-none이므로 버튼은 명시적으로 활성화
          "pointer-events-auto",
          // 크기 / 형태
          "w-14 h-14 rounded-full",
          // 색상
          isOpen
            ? "bg-gray-600 text-white shadow-lg"
            : "bg-purple-600 text-white shadow-3d",
          // 호버 / 액티브
          "hover:scale-110 active:scale-95",
          // 트랜지션
          "transition-all duration-300",
          // 창 닫혀있을 때만 플로팅 애니메이션
          !isOpen && "animate-float",
        )}
        aria-label={isOpen ? "챗봇 닫기" : "AI 챗봇 열기"}
        aria-expanded={isOpen}
      >
        {/* 아이콘: 열림/닫힘 토글 (회전 트랜지션) */}
        <span
          className={cn(
            "flex items-center justify-center transition-transform duration-300",
            isOpen ? "rotate-90" : "rotate-0",
          )}
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </span>
      </button>
    </div>
  );
}
