"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCheckDouble,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useNotification } from "@/context/NotificationContext";
import NotificationItem from "@/components/notification/NotificationItem";

/**
 * 알림 드롭다운 패널
 * - Navigation 하단 바 위에 bottom-16 위치로 고정
 * - 외부 클릭 시 자동 닫힘
 * - 로딩 스켈레톤 / 빈 상태 / 알림 목록 표시
 * - 전체 읽음 / 전체 삭제 버튼 (헤더)
 */
export default function NotificationDropdown() {
  const {
    isOpen,
    notifications,
    isLoading,
    closeDropdown,
    markAllRead,
    deleteAll,
  } = useNotification();

  // 전체삭제 2-step 확인 (첫 클릭: confirm 상태, 두 번째 클릭: 실행)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // 드롭다운 DOM 참조 (외부 클릭 감지용)
  const panelRef = useRef<HTMLDivElement>(null);
  // confirm 타이머 (3초 후 자동 취소)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 패널 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };

    // capture phase: Navigation 내부 버튼 클릭이 먼저 처리되도록
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen, closeDropdown]);

  // 컴포넌트 언마운트 시 confirm 타이머 정리
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const hasUnread = notifications.some((n) => !n.isRead);
  const hasNotifications = notifications.length > 0;

  /** 전체삭제 버튼 클릭 핸들러 (2-step confirm) */
  const handleDeleteClick = () => {
    if (!isConfirmingDelete) {
      // 1단계: confirm 상태로 전환, 3초 후 자동 취소
      setIsConfirmingDelete(true);
      confirmTimerRef.current = setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 3000);
      return;
    }
    // 2단계: 실제 삭제 실행
    setIsConfirmingDelete(false);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    deleteAll();
  };

  return (
    <div
      ref={panelRef}
      // top-[60px]: 상단 벨 버튼(top-3 + h-10 = 52px) 바로 아래 / z-60: Navigation(z-50) 위에 표시
      className="
        fixed top-15 right-2 z-60
        w-80 max-h-[70vh] flex flex-col
        bg-white rounded-2xl shadow-2xl shadow-black/10
        border border-gray-100 overflow-hidden
      "
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faBell} className="text-purple-500 text-sm" />
          <h3 className="text-sm font-bold text-gray-800">알림</h3>
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex items-center gap-2">
          {/* 전체 읽음 버튼 (미읽음 있을 때만 활성) */}
          <button
            onClick={markAllRead}
            disabled={!hasUnread}
            className="
              flex items-center gap-1.5 text-xs font-medium
              text-gray-400 hover:text-purple-600
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors duration-150
            "
          >
            <FontAwesomeIcon icon={faCheckDouble} />
            전체 읽음
          </button>

          {/* 구분선 */}
          {hasNotifications && (
            <span className="text-gray-200 select-none">|</span>
          )}

          {/* 전체 삭제 버튼 (알림 있을 때만 표시, 2-step confirm) */}
          {hasNotifications && (
            <button
              onClick={handleDeleteClick}
              className={`
                flex items-center gap-1.5 text-xs font-medium transition-colors duration-150
                ${
                  isConfirmingDelete
                    ? // confirm 상태: 빨간색으로 강조 (한 번 더 누르면 삭제됩니다)
                      "text-red-500 hover:text-red-700"
                    : "text-gray-400 hover:text-red-500"
                }
              `}
            >
              <FontAwesomeIcon icon={faTrash} />
              {isConfirmingDelete ? "삭제 확인" : "전체 삭제"}
            </button>
          )}
        </div>
      </div>

      {/* 본문: 로딩 / 빈 상태 / 목록 */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div
                    className="h-3 bg-gray-100 rounded animate-pulse"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                  <div
                    className="h-3 w-2/3 bg-gray-100 rounded animate-pulse"
                    style={{ animationDelay: `${i * 60 + 30}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          // 빈 상태
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FontAwesomeIcon
              icon={faBell}
              className="text-3xl text-gray-200 mb-3"
            />
            <p className="text-sm text-gray-400">아직 알림이 없습니다</p>
          </div>
        ) : (
          // 알림 목록 (읽음/미읽음 혼합 표시)
          <div className="divide-y divide-gray-50">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={closeDropdown}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
