"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { userAPI, followAPI, dashboardAPI } from "@/lib/api";
import {
  UserResponse,
  UserSummaryResponse,
  DashboardSummaryResponse,
  HashtagStatDto,
  StreakResponse,
} from "@/lib/types";

import CreatorSummaryCard from "@/components/dashboard/CreatorSummaryCard";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import TopPostsList from "@/components/dashboard/TopPostsList";
import FollowerInsights from "@/components/dashboard/FollowerInsights";
import HashtagAnalytics from "@/components/dashboard/HashtagAnalytics";
import ActivityStreakCalendar from "@/components/dashboard/ActivityStreakCalendar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faChartBar } from "@fortawesome/free-solid-svg-icons";

// ─── DashboardContent ────────────────────────────────────────────────────────

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [freshUser, setFreshUser] = useState<UserResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [hashtags, setHashtags] = useState<HashtagStatDto[]>([]);
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [followers, setFollowers] = useState<UserSummaryResponse[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        const [meRes, summaryRes, hashtagsRes, streakRes, followersRes] =
          await Promise.all([
            userAPI.getMe(),
            dashboardAPI.getSummary(),
            dashboardAPI.getHashtagAnalytics(8),
            dashboardAPI.getStreak(84),
            followAPI.getFollowers(user.email, 0, 20),
          ]);

        if (!meRes.success)
          throw new Error(meRes.message ?? "사용자 정보 조회 실패");
        if (!summaryRes.success)
          throw new Error(summaryRes.message ?? "요약 지표 조회 실패");

        setFreshUser(meRes.data);
        setSummary(summaryRes.data);
        if (hashtagsRes.success) setHashtags(hashtagsRes.data.hashtags ?? []);
        if (streakRes.success) setStreak(streakRes.data);
        if (followersRes.success) setFollowers(followersRes.data.content ?? []);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "데이터 로딩 중 오류가 발생했습니다.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">대시보드를 불러오는 중...</p>
      </div>
    );
  }

  if (!freshUser || !summary) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="뒤로가기"
        >
          <FontAwesomeIcon
            icon={faArrowLeft}
            className="text-gray-600 text-sm"
          />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faChartBar} className="text-purple-500" />
          크리에이터 대시보드
        </h1>
      </div>

      {/* 요약 카드 — summary API 데이터 사용 */}
      <CreatorSummaryCard user={freshUser} summary={summary} />

      {/* 성과 분석 차트 — 자체 데이터 페칭 (period 변경 시 재호출) */}
      <AnalyticsChart />

      {/* 스트릭 캘린더 — streak API 데이터 사용 */}
      {streak && <ActivityStreakCalendar streak={streak} />}

      {/* 하단 2열 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* TOP 게시글 — 자체 데이터 페칭 (metric 탭 전환 시 재호출) */}
        <TopPostsList />
        {/* 해시태그 성과 — hashtags API 데이터 사용 */}
        <HashtagAnalytics hashtags={hashtags} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FollowerInsights
          followers={followers}
          totalFollowerCount={summary.followerCount}
        />
        <div className="hidden md:block" />
      </div>
    </div>
  );
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
