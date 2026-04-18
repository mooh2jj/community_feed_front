"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faTrophy,
  faFire,
  faArrowUp,
  faArrowDown,
  faMinus,
  faCalendarWeek,
  faInfinity,
} from "@fortawesome/free-solid-svg-icons";
import RankingPodium from "@/components/RankingPodium";
import { rankingAPI } from "@/lib/api";
import { WeeklyRankingResponse, AllTimeRankingResponse, RankingUserDto } from "@/lib/types";

type Tab = "weekly" | "alltime";

// ─── 내 순위 카드 ─────────────────────────────────────────────────────────────

function MyRankingCard({ myRanking, tab }: { myRanking: RankingUserDto; tab: Tab }) {
  const { rankChange } = myRanking;

  const rankChangeBadge = () => {
    if (rankChange === null)
      return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">신규 진입</span>;
    if (rankChange > 0)
      return (
        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
          <FontAwesomeIcon icon={faArrowUp} />
          {rankChange}위 상승
        </span>
      );
    if (rankChange < 0)
      return (
        <span className="flex items-center gap-1 text-xs font-bold text-red-500">
          <FontAwesomeIcon icon={faArrowDown} />
          {Math.abs(rankChange)}위 하락
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
        <FontAwesomeIcon icon={faMinus} />
        순위 유지
      </span>
    );
  };

  return (
    <div className="mt-8 p-5 bg-gradient-to-r from-purple-600 to-pink-500 rounded-3xl shadow-xl text-white">
      <p className="text-xs font-semibold text-white/70 mb-2">
        {tab === "weekly" ? "📅 나의 이번 주 순위" : "🏅 나의 전체 기간 순위"}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-2xl">
            {myRanking.rank}위
          </div>
          <div>
            <p className="font-bold text-lg">{myRanking.name}</p>
            <div className="flex items-center gap-2 mt-0.5">{rankChangeBadge()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faFire} className="text-orange-300" aria-hidden="true" />
            <span className="font-bold text-2xl tabular-nums">
              {myRanking.score.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-0.5">점</p>
        </div>
      </div>
    </div>
  );
}

// ─── 로딩 스켈레톤 ────────────────────────────────────────────────────────────

function RankingSkeleton() {
  return (
    <div aria-busy="true" aria-label="랭킹 로딩 중">
      <div className="flex items-end justify-center gap-4 mb-8">
        {[44, 56, 36].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div
              className="w-full bg-gray-200 rounded-t-3xl animate-pulse"
              style={{ height: `${h * 4}px` }}
            />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="w-16 h-5 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 랭킹 페이지 ─────────────────────────────────────────────────────────────

/**
 * 랭킹 페이지
 * - 주간 랭킹 / 전체 기간 탭 전환
 * - 로그인 시 "내 순위" 카드 표시
 * - 비로그인도 랭킹 조회 가능
 */
export default function RankingPage() {
  const [tab, setTab] = useState<Tab>("weekly");
  const [weeklyData, setWeeklyData] = useState<WeeklyRankingResponse | null>(null);
  const [alltimeData, setAlltimeData] = useState<AllTimeRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 두 API 병렬 호출 (마운트 시 1회)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [wRes, aRes] = await Promise.all([
          rankingAPI.getWeeklyRanking(10),
          rankingAPI.getAllTimeRanking(10),
        ]);
        if (wRes.success) setWeeklyData(wRes.data);
        if (aRes.success) setAlltimeData(aRes.data);
      } catch {
        setError("랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rankings: RankingUserDto[] =
    tab === "weekly"
      ? (weeklyData?.rankings ?? [])
      : (alltimeData?.rankings ?? []);

  const myRanking: RankingUserDto | null =
    tab === "weekly" ? (weeklyData?.myRanking ?? null) : (alltimeData?.myRanking ?? null);

  // 주간 탭 부가 정보 텍스트
  const weekPeriodLabel = weeklyData
    ? `${weeklyData.weekStart} ~ ${weeklyData.weekEnd}`
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100">
        <div className="max-w-screen-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" aria-label="메인 피드로 돌아가기">
            <Button variant="ghost" size="sm">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" aria-hidden="true" />
              돌아가기
            </Button>
          </Link>
          <h1 className="text-lg font-bold gradient-text">🏆 랭킹</h1>
          <div className="w-20" aria-hidden="true" />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-screen-lg mx-auto px-4 py-8">
        {/* 타이틀 */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 shadow-3d animate-float"
            aria-hidden="true"
          >
            <FontAwesomeIcon icon={faTrophy} className="text-4xl text-white" />
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-2">이번 주 스터디 챔피언</h2>
          <p className="text-gray-600">꾸준한 노력으로 빛나는 여러분을 응원합니다! 🎉</p>
        </div>

        {/* 탭 */}
        <div
          className="flex gap-2 bg-white border-2 border-purple-100 rounded-2xl p-1.5 mb-6 max-w-xs mx-auto shadow-sm"
          role="tablist"
          aria-label="랭킹 기간 선택"
        >
          <button
            role="tab"
            aria-selected={tab === "weekly"}
            aria-controls="ranking-panel"
            onClick={() => setTab("weekly")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === "weekly"
                ? "bg-purple-600 text-white shadow"
                : "text-gray-500 hover:text-purple-600"
            }`}
          >
            <FontAwesomeIcon icon={faCalendarWeek} aria-hidden="true" />
            주간
          </button>
          <button
            role="tab"
            aria-selected={tab === "alltime"}
            aria-controls="ranking-panel"
            onClick={() => setTab("alltime")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === "alltime"
                ? "bg-purple-600 text-white shadow"
                : "text-gray-500 hover:text-purple-600"
            }`}
          >
            <FontAwesomeIcon icon={faInfinity} aria-hidden="true" />
            전체 기간
          </button>
        </div>

        {/* 주간 탭: 주차 + 기간 표시 */}
        {tab === "weekly" && weeklyData && (
          <div className="text-center mb-6">
            <span className="inline-block text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              {weeklyData.weekLabel} · {weekPeriodLabel}
            </span>
          </div>
        )}

        {/* 랭킹 컨텐츠 */}
        <section id="ranking-panel" role="tabpanel" aria-label={`${tab === "weekly" ? "주간" : "전체 기간"} 랭킹`}>
          {error ? (
            <div className="text-center py-16 text-red-500">
              <p className="text-4xl mb-3">😥</p>
              <p>{error}</p>
            </div>
          ) : loading ? (
            <RankingSkeleton />
          ) : (
            <RankingPodium rankings={rankings} />
          )}
        </section>

        {/* 내 순위 카드 (로그인 + API가 myRanking 포함 시) */}
        {!loading && myRanking && <MyRankingCard myRanking={myRanking} tab={tab} />}

        {/* 점수 계산 안내 */}
        <div className="mt-10 p-6 bg-white rounded-3xl border-2 border-purple-100 shadow-lg">
          <h3 className="font-bold text-lg mb-3 gradient-text">📊 점수 계산 방식</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" aria-hidden="true" />
              <span>
                {tab === "weekly"
                  ? "이번 주 게시글 1개 = 10점"
                  : "누적 게시글 1개 = 10점"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" aria-hidden="true" />
              <span>
                {tab === "weekly"
                  ? "이번 주 신규 팔로워 1명 = 5점"
                  : "누적 팔로워 1명 = 5점"}
              </span>
            </li>
            {tab === "weekly" && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" aria-hidden="true" />
                <span>매주 월요일 자정 점수 초기화 · 매시간 실시간 반영</span>
              </li>
            )}
            {tab === "alltime" && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" aria-hidden="true" />
                <span>전체 기간 랭킹은 매주 월요일 자정 DB 재집계</span>
              </li>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
