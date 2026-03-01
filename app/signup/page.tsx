"use client";

import { useState } from "react";
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
  faUser,
  faStar,
  faEye,
  faEyeSlash,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";
import { userAPI } from "@/lib/api";
import { toast } from "sonner";

// ─── Zod 검증 스키마 ─────────────────────────────────────────────────────────
const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, "이름을 입력해주세요")
      .min(2, "이름은 2자 이상이어야 합니다")
      .max(20, "이름은 20자 이하여야 합니다"),
    email: z
      .string()
      .min(1, "이메일을 입력해주세요")
      .email("올바른 이메일 형식이 아닙니다"),
    password: z
      .string()
      .min(1, "비밀번호를 입력해주세요")
      .min(8, "비밀번호는 8자 이상이어야 합니다"),
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["passwordConfirm"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

/**
 * 회원가입 페이지
 * react-hook-form + zod 기반 폼 검증, 이메일 중복 확인
 */
export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const watchedEmail = watch("email");

  // 이미 로그인 상태면 홈으로 이동
  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  // ─── 이메일 중복 확인 ──────────────────────────────────────────────────────
  const handleCheckEmail = async () => {
    if (!watchedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchedEmail)) {
      setError("email", { message: "올바른 이메일을 입력한 후 확인해주세요" });
      return;
    }

    setCheckingEmail(true);
    try {
      const result = await userAPI.checkEmail(watchedEmail);
      if (result.data) {
        setError("email", { message: "이미 사용 중인 이메일입니다" });
        setEmailChecked(false);
      } else {
        clearErrors("email");
        setEmailChecked(true);
        toast.success("사용 가능한 이메일입니다");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "이메일 확인에 실패했습니다";
      toast.error(message);
    } finally {
      setCheckingEmail(false);
    }
  };

  // ─── 회원가입 제출 ─────────────────────────────────────────────────────────
  const onSubmit = async (data: SignupFormData) => {
    if (!emailChecked) {
      setError("email", { message: "이메일 중복 확인을 해주세요" });
      return;
    }

    try {
      await signup(data.email, data.password, data.name);
      toast.success("🎉 회원가입이 완료되었습니다! 로그인해주세요.");
      router.push("/login");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "회원가입에 실패했습니다";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-white px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* 상단 네비 */}
        <div className="flex items-center">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              로그인으로
            </Button>
          </Link>
        </div>

        {/* 로고 */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <FontAwesomeIcon icon={faStar} className="text-white text-2xl" />
          </div>
          <h1 className="mt-4 text-3xl font-bold gradient-text">회원가입</h1>
          <p className="mt-2 text-gray-500">StudyMate에 합류하세요!</p>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* 이름 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                <FontAwesomeIcon
                  icon={faUser}
                  className="mr-2 text-purple-600"
                />
                이름
              </Label>
              <Input
                type="text"
                placeholder="이름을 입력하세요"
                {...register("name")}
                className="border-2 border-purple-200 focus:border-purple-500 rounded-xl py-5"
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* 이메일 + 중복 확인 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="mr-2 text-purple-600"
                />
                이메일
              </Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your-email@example.com"
                  {...register("email", {
                    onChange: () => setEmailChecked(false),
                  })}
                  className="flex-1 border-2 border-purple-200 focus:border-purple-500 rounded-xl py-5"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckEmail}
                  disabled={checkingEmail}
                  className="shrink-0 border-2 border-purple-300 hover:border-purple-500 rounded-xl"
                >
                  {checkingEmail ? "확인 중..." : "중복확인"}
                </Button>
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
              {emailChecked && !errors.email && (
                <p className="text-xs text-green-600">
                  ✅ 사용 가능한 이메일입니다
                </p>
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

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                <FontAwesomeIcon
                  icon={faLock}
                  className="mr-2 text-purple-600"
                />
                비밀번호 확인
              </Label>
              <div className="relative">
                <Input
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  {...register("passwordConfirm")}
                  className="border-2 border-purple-200 focus:border-purple-500 rounded-xl py-5 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={showPasswordConfirm ? faEyeSlash : faEye}
                    className="text-sm"
                  />
                </button>
              </div>
              {errors.passwordConfirm && (
                <p className="text-xs text-red-500">
                  {errors.passwordConfirm.message}
                </p>
              )}
            </div>

            {/* 가입 버튼 */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-6 text-lg font-bold rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30 transition-all duration-300"
            >
              {isSubmitting ? "가입 중..." : "회원가입"}
            </Button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
