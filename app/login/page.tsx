"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faStar,
  faEye,
  faEyeSlash,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { faCircle } from "@fortawesome/free-regular-svg-icons";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// ─── Zod 검증 스키마 ─────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요")
    .email("올바른 이메일 형식이 아닙니다"),
  password: z
    .string()
    .min(1, "비밀번호를 입력해주세요")
    .min(8, "비밀번호는 8자 이상이어야 합니다"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * 로그인 페이지
 * react-hook-form + zod 기반 폼 검증
 */
// localStorage 키 상수
const REMEMBER_EMAIL_KEY = "studymate_remember_email";
const SAVED_EMAIL_KEY = "studymate_saved_email";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // 마운트 시 저장된 이메일·기억하기 상태 복원
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved === "true") {
      setRememberEmail(true);
      const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
      if (savedEmail) setValue("email", savedEmail);
    }
  }, [setValue]);

  // 이미 로그인 상태면 홈으로 이동 (useEffect로 안전하게 처리)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    // 아이디 기억하기 체크 여부에 따라 localStorage 저장/삭제
    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, "true");
      localStorage.setItem(SAVED_EMAIL_KEY, data.email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    try {
      await login(data.email, data.password);
      toast.success("🎉 로그인 되었습니다!");
      router.push("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "로그인에 실패했습니다";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-white px-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <FontAwesomeIcon icon={faStar} className="text-white text-2xl" />
          </div>
          <h1 className="mt-4 text-3xl font-bold gradient-text">StudyMate</h1>
          <p className="mt-2 text-gray-500">스터디 인증 커뮤니티에 로그인</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* 이메일 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="mr-2 text-purple-600"
                />
                이메일
              </Label>
              <Input
                type="email"
                placeholder="your-email@example.com"
                {...register("email")}
                className="border-2 border-purple-200 focus:border-purple-500 rounded-xl py-5"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                <FontAwesomeIcon
                  icon={faLock}
                  className="mr-2 text-purple-600"
                />
                비밀번호
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="8자 이상 입력하세요"
                  {...register("password")}
                  className="border-2 border-purple-200 focus:border-purple-500 rounded-xl py-5 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    className="text-sm"
                  />
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 아이디 기억하기 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRememberEmail((prev) => !prev)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 transition-colors select-none"
                aria-pressed={rememberEmail}
              >
                <FontAwesomeIcon
                  icon={rememberEmail ? faCircleCheck : faCircle}
                  className={`text-lg transition-colors ${
                    rememberEmail ? "text-purple-600" : "text-gray-300"
                  }`}
                />
                <span className={rememberEmail ? "text-purple-600 font-medium" : ""}>
                  아이디 기억하기
                </span>
              </button>
            </div>

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-6 text-lg font-bold rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30 transition-all duration-300"
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
