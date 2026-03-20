"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faUserMinus } from "@fortawesome/free-solid-svg-icons";
import { followAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface FollowButtonProps {
  /** 팔로우 대상 이메일 */
  targetEmail: string;
  /** 초기 팔로우 여부 (서버에서 받은 isFollowing) */
  initialIsFollowing: boolean;
  /** 팔로우 성공 후 외부 콜백 (팔로워 수 갱신 등) */
  onFollowChange?: (isFollowing: boolean, followerCount: number) => void;
  /** 버튼 크기 변형 */
  size?: "sm" | "md";
}

/**
 * 재사용 가능한 팔로우/언팔로우 버튼
 * - 자기 자신이면 렌더링하지 않음
 * - 비로그인이면 로그인 페이지로 이동
 * - 낙관적 업데이트 + 실패 시 롤백
 */
export default function FollowButton({
  targetEmail,
  initialIsFollowing,
  onFollowChange,
  size = "sm",
}: FollowButtonProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  // 자기 자신 게시글에는 팔로우 버튼 미노출
  if (user?.email === targetEmail) return null;

  const handleFollow = async (e: React.MouseEvent) => {
    // 카드의 Link 클릭 이벤트(페이지 이동) 차단
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    // 비로그인 사용자 처리
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    // 낙관적 업데이트: 즉시 UI 반영 후 API 호출
    const prevIsFollowing = isFollowing;
    setIsFollowing(!isFollowing);
    setIsLoading(true);

    try {
      if (prevIsFollowing) {
        const result = await followAPI.unfollow(targetEmail);
        toast.success("팔로우를 취소했습니다");
        onFollowChange?.(false, result.data.followerCount);
      } else {
        const result = await followAPI.follow(targetEmail);
        toast.success("✅ 팔로우했습니다!");
        onFollowChange?.(true, result.data.followerCount);
      }
    } catch (error) {
      // 실패 시 이전 상태로 롤백
      setIsFollowing(prevIsFollowing);
      const message =
        error instanceof Error ? error.message : "오류가 발생했습니다";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 버튼 크기별 스타일
  const sizeClass =
    size === "md" ? "px-4 py-1.5 text-sm gap-2" : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`
        flex items-center shrink-0 font-semibold rounded-full border transition-all duration-200
        ${sizeClass}
        ${
          isFollowing
            ? "border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50"
            : "border-purple-500 text-purple-600 hover:bg-purple-50"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      aria-label={isFollowing ? "팔로우 취소" : "팔로우"}
    >
      <FontAwesomeIcon
        icon={isFollowing ? faUserMinus : faUserPlus}
        className={size === "md" ? "text-sm" : "text-xs"}
      />
      <span>{isFollowing ? "팔로잉" : "팔로우"}</span>
    </button>
  );
}
