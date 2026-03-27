"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faComment,
  faUserPlus,
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
    // postId: 게시글 ID, referenceId: commentId → 해당 댓글 앵커로 이동
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

/**
 * 알림 단일 아이템
 * - type별 아이콘/메시지/이동 경로 자동 결정
 * - 읽음/미읽음 배경 시각적 구분
 */
export default function NotificationItem({
  notification,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const { markOneRead } = useNotification();
  const config = NOTIFICATION_CONFIG[notification.type];

  const handleClick = () => {
    // 미읽음 알림인 경우 읽음 처리 (Optimistic Update)
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
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full flex items-start gap-3 px-4 py-3
        text-left transition-colors duration-150
        hover:bg-gray-50 active:bg-gray-100
        ${notification.isRead ? "bg-white" : "bg-purple-50/60"}
      `}
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

      {/* 미읽음 점 */}
      {!notification.isRead && (
        <span className="shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-2" />
      )}
    </button>
  );
}
