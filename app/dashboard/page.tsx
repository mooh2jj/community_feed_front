"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { userAPI, followAPI } from "@/lib/api";
import { PostResponse, UserResponse, UserSummaryResponse, DailyMetric } from "@/lib/types";

import CreatorSummaryCard from "@/components/dashboard/CreatorSummaryCard";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import TopPostsList from "@/components/dashboard/TopPostsList";
import FollowerInsights from "@/components/dashboard/FollowerInsights";
import HashtagAnalytics from "@/components/dashboard/HashtagAnalytics";
import ActivityStreakCalendar from "@/components/dashboard/ActivityStreakCalendar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faChartBar } from "@fortawesome/free-solid-svg-icons";

// ─── 데이터 가공 헬퍼 ────────────────────────────────────────────────────────

/** 지난 N일치 날짜 배열을 "yyyy-MM-dd" 형식으로 반환 */
function buildDateRange(days: number): string[] {
  return Array.from({ length: days }, (_, i) =>
    format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd")
  );
}

/** 게시글 배열에서 특정 수치 필드의 일별 합산 DailyMetric 배열을 생성 */
function buildDailyMetric(
  posts: PostResponse[],
  field: "viewCount" | "likeCount"
): DailyMetric[] {
  const DAYS = 90;
  const dateRange = buildDateRange(DAYS);
  const sumMap = new Map<string, number>();

  for (const post of posts) {
    const d = post.createdAt.slice(0, 10);
    sumMap.set(d, (sumMap.get(d) ?? 0) + post[field]);
  }

  return dateRange.map((date) => ({ date, count: sumMap.get(date) ?? 0 }));
}

/** 게시글 배열에서 일별 작성 건수 DailyMetric 배열을 생성 */
function buildDailyPostCount(posts: PostResponse[]): DailyMetric[] {
  const DAYS = 90;
  const dateRange = buildDateRange(DAYS);
  const countMap = new Map<string, number>();

  for (const post of posts) {
    const d = post.createdAt.slice(0, 10);
    countMap.set(d, (countMap.get(d) ?? 0) + 1);
  }

  return dateRange.map((date) => ({ date, count: countMap.get(date) ?? 0 }));
}

/** 팔로워 증감은 실시간 API로 얻을 수 없으므로 최근 90일 팔로워 목록 생성일 기반으로 추정 */
function buildDailyFollower(followers: UserSummaryResponse[]): DailyMetric[] {
  const DAYS = 90;
  const dateRange = buildDateRange(DAYS);
  // followers 타입에 createdAt이 없으므로 빈 데이터로 반환 (팔로워 증감 차트 제한)
  return dateRange.map((date) => ({ date, count: 0 }));
}

// ─── DashboardContent ────────────────────────────────────────────────────────

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [freshUser, setFreshUser] = useState<UserResponse | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [followers, setFollowers] = useState<UserSummaryResponse[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        const [meRes, postsRes, followersRes] = await Promise.all([
          userAPI.getMe(),
          userAPI.getMyPosts(1, 100),
          followAPI.getFollowers(user.email, 0, 20),
        ]);

        if (!meRes.success) throw new Error(meRes.message ?? "사용자 정보 조회 실패");
        if (!postsRes.success) throw new Error(postsRes.message ?? "게시글 조회 실패");

        setFreshUser(meRes.data);
        setPosts(postsRes.data.items ?? []);
        if (followersRes.success) {
          setFollowers(followersRes.data.content ?? []);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "데이터 로딩 중 오류가 발생했습니다.");
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

  if (!freshUser) return null;

  // 파생 지표 계산
  const totalLikes = posts.reduce((s, p) => s + p.likeCount, 0);
  const totalViews = posts.reduce((s, p) => s + p.viewCount, 0);
  const totalComments = posts.reduce((s, p) => s + p.commentCount, 0);

  const dailyViews = buildDailyMetric(posts, "viewCount");
  const dailyLikes = buildDailyMetric(posts, "likeCount");
  const dailyPostCount = buildDailyPostCount(posts);
  const dailyFollowers = buildDailyFollower(followers);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="뒤로가기"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-gray-600 text-sm" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faChartBar} className="text-purple-500" />
          크리에이터 대시보드
        </h1>
      </div>

      {/* 요약 카드 */}
      <CreatorSummaryCard
        user={freshUser}
        totalLikes={totalLikes}
        totalViews={totalViews}
        totalComments={totalComments}
      />

      {/* 성과 분석 차트 (풀 폭) */}
      <AnalyticsChart
        views={dailyViews}
        likes={dailyLikes}
        posts={dailyPostCount}
        followers={dailyFollowers}
      />

      {/* 스트릭 캘린더 (풀 폭) */}
      <ActivityStreakCalendar posts={posts} />

      {/* 하단 2열 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TopPostsList posts={posts} />
        <HashtagAnalytics posts={posts} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FollowerInsights
          followers={followers}
          totalFollowerCount={freshUser.followerCount}
        />
        {/* 추후 확장 영역 */}
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
