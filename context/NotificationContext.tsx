"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { NotificationResponse } from "@/lib/types";
import {
  notificationAPI,
  subscribeNotifications,
  getAccessToken,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ─── Context 타입 ────────────────────────────────────────────────────────────
interface NotificationContextType {
  /** 미읽음 알림 개수 (뱃지 표시용) */
  unreadCount: number;
  /** 알림 목록 (드롭다운 표시용) */
  notifications: NotificationResponse[];
  /** 드롭다운 열림 여부 */
  isOpen: boolean;
  /** 알림 목록 로딩 중 여부 */
  isLoading: boolean;
  /** 드롭다운 열기/닫기 토글 + 열릴 때 목록 새로고침 */
  toggleDropdown: () => void;
  /** 드롭다운 닫기 */
  closeDropdown: () => void;
  /** 전체 읽음 처리 */
  markAllRead: () => Promise<void>;
  /** 단일 알림 읽음 처리 (클릭 시 호출) */
  markOneRead: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// ─── NotificationProvider ────────────────────────────────────────────────────
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // SSE EventSource 참조 (cleanup 시 close() 호출)
  const esRef = useRef<EventSource | null>(null);

  /**
   * 알림 목록 전체를 서버에서 가져와 상태 업데이트
   * 드롭다운을 열 때마다 호출
   */
  // 드롭다운 열릴 때 미읽음 알림만 조회 (isRead=false)
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await notificationAPI.getAll(false);
      setNotifications(res.data);
    } catch (e) {
      console.error("[Notification] 목록 조회 실패:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * 인증 상태 변경 시:
   * - 로그인: 미읽음 개수 초기화 + SSE 구독 시작
   * - 로그아웃: SSE 해제 + 상태 초기화
   */
  useEffect(() => {
    if (!isAuthenticated) {
      // 로그아웃 → SSE 닫기 + 상태 초기화
      esRef.current?.close();
      esRef.current = null;
      setUnreadCount(0);
      setNotifications([]);
      setIsOpen(false);
      return;
    }

    // 미읽음 개수 초기화 (뱃지 즉시 표시)
    notificationAPI
      .getUnreadCount()
      .then((res) => setUnreadCount(res.data))
      .catch((e) => console.error("[Notification] 미읽음 개수 조회 실패:", e));

    // SSE 구독 시작 (토큰은 메모리에서 직접 읽기)
    const token = getAccessToken();
    if (!token) return;

    const es = subscribeNotifications(token, {
      onConnected: () => {
        console.log("[SSE] 알림 서비스 연결 완료");
      },
      onNotification: (notification) => {
        // 실시간 알림 수신: 뱃지 +1, 목록 앞에 prepend
        setUnreadCount((prev) => prev + 1);
        setNotifications((prev) => [notification, ...prev]);
      },
      onError: (e) => {
        console.error("[SSE] 알림 연결 오류:", e);
      },
    });

    esRef.current = es;

    // 컴포넌트 언마운트 / 로그아웃 시 SSE 정리
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isAuthenticated]);

  /** 드롭다운 토글: 열릴 때 목록 새로고침 */
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) fetchNotifications();
      return next;
    });
  }, [fetchNotifications]);

  /** 드롭다운 닫기 */
  const closeDropdown = useCallback(() => setIsOpen(false), []);

  /**
   * 전체 읽음 처리
   * PATCH 성공 시 unreadCount 0, 목록의 isRead 일괄 true로 업데이트
   */
  const markAllRead = useCallback(async () => {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error("[Notification] 전체 읽음 처리 실패:", e);
    }
  }, []);

  /**
   * 단일 알림 읽음 처리 (Optimistic Update)
   * - 이미 읽은 알림이면 API 호출 생략
   * - UI를 즉시 업데이트 후 API 호출 (Optimistic)
   * - API 실패 시 롤백
   */
  const markOneRead = useCallback(
    async (id: number) => {
      const target = notifications.find((n) => n.id === id);
      // 이미 읽음 처리된 알림이면 불필요한 API 호출 스킵
      if (!target || target.isRead) return;

      // Optimistic Update: API 응답 전에 UI 즉시 반영
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationAPI.markRead(id);
      } catch (e) {
        console.error("[Notification] 읽음 처리 실패 - 롤백:", e);
        // API 실패 시 롤백
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [notifications],
  );

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        isOpen,
        isLoading,
        toggleDropdown,
        closeDropdown,
        markAllRead,
        markOneRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/** 알림 컨텍스트 훅 */
export function useNotification(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotification은 NotificationProvider 내부에서 사용해야 합니다.",
    );
  }
  return ctx;
}
