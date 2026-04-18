"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faFire,
  faChevronRight,
  faArrowUp,
  faArrowDown,
  faMinus,
} from "@fortawesome/free-solid-svg-icons";
import { rankingAPI } from "@/lib/api";
import { WeeklyRankingResponse } from "@/lib/types";

let _cache: { data: WeeklyRankingResponse; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchWithCache(): Promise<WeeklyRankingResponse | null> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;
  try {
    const res = await rankingAPI.getWeeklyRanking(5);
    if (res.success) {
      _cache = { data: res.data, ts: Date.now() };
      return res.data;
    }
  } catch {}
  return null;
}

const RANK_STYLES: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-yellow-100", text: "text-yellow-600" },
  2: { bg: "bg-gray-200", text: "text-gray-500" },
  3: { bg: "bg-orange-100", text: "text-orange-500" },
};
const getRankStyle = (rank: number) =>
  RANK_STYLES[rank] ?? { bg: "bg-gray-100", text: "text-gray-400" };

function RankChangeBadge({ change }: { change: number | null }) {
  if (change === null)
    return <span className="text-[9px] font-bold text-emerald-600">NEW</span>;
  if (change > 0)
    return (
      <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600">
        <FontAwesomeIcon icon={faArrowUp} aria-hidden="true" />
        {change}
      </span>
    );
  if (change < 0)
    return (
      <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-500">
        <FontAwesomeIcon icon={faArrowDown} aria-hidden="true" />
        {Math.abs(change)}
      </span>
    );
  return (
    <span className="text-[9px] text-gray-400">
      <FontAwesomeIcon icon={faMinus} aria-hidden="true" />
    </span>
  );
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full bg-gray-100 animate-pulse shrink-0"
              style={{ animationDelay: `${i * 60}ms` }}
            />
            <div
              className="w-6 h-6 rounded-full bg-gray-100 animate-pulse shrink-0"
              style={{ animationDelay: `${i * 60}ms` }}
            />
            <div
              className="flex-1 h-3 bg-gray-100 rounded animate-pulse"
              style={{ animationDelay: `${i * 60 + 30}ms` }}
            />
            <div
              className="w-8 h-3 bg-gray-100 rounded animate-pulse shrink-0"
              style={{ animationDelay: `${i * 60 + 30}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeeklyRankingCard() {
  const [data, setData] = useState<WeeklyRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithCache().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <Skeleton />;

  // API 실패 또는 데이터 없음 → 빈 상태 카드 (return null 금지 — 카드 자체가 사라지므로)
  if (!data || data.rankings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
          <FontAwesomeIcon
            icon={faTrophy}
            className="text-yellow-500 text-xs"
            aria-hidden="true"
          />
          이번 주 랭킹
        </h3>
        <p className="text-xs text-gray-400 text-center py-3">
          집계할 랭킹이 없습니다
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
      aria-label="이번 주 랭킹"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <FontAwesomeIcon
            icon={faTrophy}
            className="text-yellow-500 text-xs"
            aria-hidden="true"
          />
          이번 주 랭킹
        </h3>
        <Link
          href="/ranking"
          className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-0.5 transition-colors"
          aria-label="전체 랭킹 보기"
        >
          더보기
          <FontAwesomeIcon
            icon={faChevronRight}
            className="text-[9px]"
            aria-hidden="true"
          />
        </Link>
      </div>

      <ul className="space-y-2.5">
        {data.rankings.map((user) => {
          const { bg, text } = getRankStyle(user.rank);
          return (
            <li
              key={user.email}
              className="flex items-center gap-2"
              aria-label={`${user.rank}위 ${user.name} ${user.score.toLocaleString()}점`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${bg} ${text}`}
              >
                {user.rank}
              </span>
              <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                {user.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={user.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full bg-purple-400 flex items-center justify-center text-white text-[9px] font-bold"
                    aria-hidden="true"
                  >
                    {user.name[0]}
                  </div>
                )}
              </div>
              <span className="flex-1 text-xs font-medium text-gray-700 truncate">
                {user.name}
              </span>
              <div className="flex flex-col items-end shrink-0 gap-0.5">
                <div className="flex items-center gap-0.5">
                  <FontAwesomeIcon
                    icon={faFire}
                    className="text-orange-500 text-[9px]"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-bold tabular-nums text-orange-600">
                    {user.score.toLocaleString()}
                  </span>
                </div>
                <RankChangeBadge change={user.rankChange} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
