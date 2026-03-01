"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  /** 로딩 중 표시할 폴백 UI (기본: 스켈레톤) */
  fallback?: React.ReactNode;
}

/**
 * 인증이 필요한 페이지를 감싸는 가드 컴포넌트
 * 비로그인 시 /login으로 리다이렉트
 */
export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // 로딩 중 표시
  if (isLoading) {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full" />
            <p className="text-gray-500 text-sm">인증 확인 중...</p>
          </div>
        </div>
      )
    );
  }

  // 비로그인이면 렌더링하지 않음 (리다이렉트 대기)
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
