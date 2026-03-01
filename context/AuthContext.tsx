"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserResponse, AuthContextType } from "@/lib/types";
import { authAPI, userAPI, setAccessToken } from "@/lib/api";
import { toast } from "sonner";

// ─── Context 생성 ────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── AuthProvider ────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 앱 시작 시 silent refresh → 사용자 정보 복원
   * refreshToken(HttpOnly Cookie)이 유효하면 새 accessToken을 발급받고,
   * /users/me 로 사용자 정보를 가져온다.
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // refreshToken 쿠키로 새 accessToken 발급 시도
        const tokenResult = await authAPI.refresh();
        setAccessToken(tokenResult.data.accessToken);

        // 사용자 정보 조회
        const userResult = await userAPI.getMe();
        setUser(userResult.data);
      } catch {
        // refreshToken 없거나 만료됨 → 비로그인 상태
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * fetchAPI interceptor에서 발행한 auth:logout 이벤트 수신
   * refreshToken 만료 시 자동 로그아웃 처리
   */
  useEffect(() => {
    const handleForceLogout = () => {
      setAccessToken(null);
      setUser(null);
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
    };

    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  // ─── 로그인 ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const tokenResult = await authAPI.login(email, password);
    setAccessToken(tokenResult.data.accessToken);

    // 사용자 정보 조회
    const userResult = await userAPI.getMe();
    setUser(userResult.data);
  }, []);

  // ─── 회원가입 ──────────────────────────────────────────────────────────────
  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      await authAPI.join(email, password, name);
    },
    [],
  );

  // ─── 로그아웃 ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── 커스텀 훅 ──────────────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서 사용해야 합니다.");
  }
  return context;
}
