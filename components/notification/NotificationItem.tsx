"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faComment,
  faUserPlus,
  faXmark,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { NotificationResponse, NotificationType } from "@/lib/types";
import { useNotification } from "@/context/NotificationContext";

// ─── type별 전략 해시맵 ───────────────────────────────────────────────────────
// type에 따른 아이콘·색상·메시지·이동 경로를 한 곳에서 관리 (Strategy 패턴)
const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    icon: typeof faHeart;
    iconColor: string;
    iconBg: string;
    getMessage: (actorName: string) => string;
    /** referenceId: LIKE=postId, COMMENT=commentId, FOLLOW=null */
    getHref: (
      referenceId: number | null,
      actorEmail: string,
      postId?: number | null,
    ) => string;
  }
> = {
  LIKE: {
    icon: faHeart,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50",
    getMessage: (actorName) => `${actorName}님이 게시글을 좋아합니다`,
    getHref: (referenceId) =>
      referenceId !== null ? `/post/${referenceId}` : "/",
  },
  COMMENT: {
    icon: faComment,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    getMessage: (actorName) => `${actorName}님이 댓글을 달았습니다`,
    getHref: (referenceId, _, postId) => {
      if (postId != null && referenceId != null)
        return `/post/${postId}#comment-${referenceId}`;
      if (postId != null) return `/post/${postId}#comments-section`;
      return "/";
    },
  },
  FOLLOW: {
    icon: faUserPlus,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
    getMessage: (actorName) => `${actorName}님이 팔로우했습니다`,
    getHref: (_, actorEmail) =>
      `/profile?email=${encodeURIComponent(actorEmail)}`,
  },
};

/** 알림 시간 표시 (방금 전 / N분 전 / N시간 전 / 날짜) */
function formatRelativeTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Date(createdAt).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

interface NotificationItemProps {
  notification: NotificationResponse;
  onClose: () => void;
}

/** 자동 취소 타이머 (ms) */
const CONFIRM_TIMEOUT_MS = 3000;

/**
 * 알림 단일 아이템
 * - type별 아이콘/메시지/이동 경로 자동 결정
 * - 읽음/미읽음 배경 시각적 구분
 * - X 클릭 → 인라인 confirm 오버레이 → 3초 자동 취소
 */
export default function NotificationItem({
  notification,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const { markOneRead, deleteOne } = useNotification();
  const config = NOTIFICATION_CONFIG[notification.type];

  // 삭제 confirm 오버레이 표시 여부
  const [isConfirming, setIsConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** confirm 모드 진입: 3초 후 자동 취소 */
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(true);
    timerRef.current = setTimeout(
      () => setIsConfirming(false),
      CONFIRM_TIMEOUT_MS,
    );
  }, []);

  /** 취소: confirm 모드 해제 */
  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  /** 삭제 확정 실행 */
  const handleConfirmDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (timerRef.current) clearTimeout(timerRef.current);
      deleteOne(notification.id);
    },
    [deleteOne, notification.id],
  );

  /** 아이템 본체 클릭 → 읽음 처리 + 페이지 이동 */
  const handleClick = useCallback(() => {
    // confirm 상태에서는 아이템 클릭 무시
    if (isConfirming) return;
    if (!notification.isRead) {
      markOneRead(notification.id);
    }
    const href = config.getHref(
      notification.referenceId,
      notification.actorEmail,
      notification.postId,
    );
    onClose();
    router.push(href);
  }, [isConfirming, notification, markOneRead, config, onClose, router]);

  return (
    // div로 래핑하여 내부 button 중첩 허용 (button inside button은 HTML 비표준)
    <div
      className={`
        relative flex items-start gap-3 px-4 py-3 cursor-pointer
        transition-colors duration-150
        ${isConfirming ? "bg-red-50/70" : notification.isRead ? "bg-white hover:bg-gray-50 active:bg-gray-100" : "bg-purple-50/60 hover:bg-purple-50"}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* 아이콘 원형 배지 */}
      <span
        className={`
          shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5
          ${config.iconBg}
        `}
      >
        <FontAwesomeIcon
          icon={config.icon}
          className={`text-sm ${config.iconColor}`}
        />
      </span>

      {/* 텍스트 영역 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">
          {config.getMessage(notification.actorName)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* 우측 영역: 미읽음 점 + X 버튼 */}
      <div className="shrink-0 flex flex-col items-center gap-1.5 mt-1">
        {!notification.isRead && (
          <span className="w-2 h-2 rounded-full bg-purple-500" />
        )}
        <button
          onClick={handleDeleteClick}
          aria-label="알림 삭제"
          className="
            w-5 h-5 flex items-center justify-center rounded-full
            text-gray-300 hover:text-red-400 hover:bg-red-50
            transition-colors duration-150
          "
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      </div>

      {/* ─── 삭제 confirm 인라인 오버레이 ─────────────────────────────────── */}
      {/* X 버튼 클릭 시 아이템 위에 슬라이드업으로 등장 */}
      <div
        className={`
          absolute inset-0 flex items-center justify-between px-4
          bg-white/95 backdrop-blur-[2px]
          transition-all duration-200 ease-out
          ${isConfirming ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-1 pointer-events-none"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 안내 텍스트 */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FontAwesomeIcon icon={faTrash} className="text-red-400 text-xs" />
          <span>알림을 삭제할까요?</span>
        </div>

        {/* 취소 / 삭제 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="
              px-3 py-1 text-xs font-medium rounded-full
              text-gray-500 bg-gray-100 hover:bg-gray-200
              transition-colors duration-150
            "
          >
            취소
          </button>
          <button
            onClick={handleConfirmDelete}
            className="
              px-3 py-1 text-xs font-medium rounded-full
              text-white bg-red-500 hover:bg-red-600
              transition-colors duration-150
            "
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
