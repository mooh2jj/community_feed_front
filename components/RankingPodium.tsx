"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faCrown,
  faMedal,
  faFire,
  faArrowUp,
  faArrowDown,
  faMinus,
} from "@fortawesome/free-solid-svg-icons";
import { RankingUserDto } from "@/lib/types";

interface RankingPodiumProps {
  rankings: RankingUserDto[];
}

// ─── rankChange 뱃지 ──────────────────────────────────────────────────────────

function RankChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        NEW
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
        <FontAwesomeIcon icon={faArrowUp} className="text-[8px]" />
        {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-500">
        <FontAwesomeIcon icon={faArrowDown} className="text-[8px]" />
        {Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-bold text-gray-400">
      <FontAwesomeIcon icon={faMinus} />
    </span>
  );
}

// ─── 시상대 순위별 스타일 헬퍼 ────────────────────────────────────────────────

function getRankIcon(rank: number) {
  if (rank === 1) return faCrown;
  if (rank === 2) return faTrophy;
  return faMedal;
}

function getRankGradient(rank: number) {
  if (rank === 1) return "from-yellow-400 to-orange-500";
  if (rank === 2) return "from-gray-300 to-gray-400";
  return "from-orange-300 to-yellow-600";
}

function getRingColor(rank: number) {
  if (rank === 1) return "ring-yellow-400 ring-offset-yellow-100";
  if (rank === 2) return "ring-gray-300 ring-offset-gray-100";
  return "ring-orange-300 ring-offset-orange-100";
}

function getPodiumHeight(rank: number) {
  if (rank === 1) return "h-56";
  if (rank === 2) return "h-44";
  return "h-36";
}

function getIconColor(rank: number) {
  if (rank === 1) return "text-yellow-400 animate-bounce";
  if (rank === 2) return "text-gray-400";
  return "text-orange-400";
}

/**
 * 랭킹 시상대 컴포넌트
 * - TOP 3: 시상대 형식 (2등 - 1등 - 3등 순)
 * - 4~N등: 카드 리스트
 * - rankChange 뱃지: NEW / 상승(↑) / 하락(↓) / 유지(–)
 */
export default function RankingPodium({ rankings }: RankingPodiumProps) {
  if (rankings.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <FontAwesomeIcon icon={faTrophy} className="text-6xl mb-4 opacity-20" aria-hidden="true" />
        <p>아직 랭킹 정보가 없습니다</p>
      </div>
    );
  }

  const topThree = rankings.slice(0, 3);
  // 시상대 표시 순서: 2등(은) — 1등(금) — 3등(동)
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean) as RankingUserDto[];
  const rest = rankings.slice(3);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 시상대 TOP 3 */}
      <div className="flex items-end justify-center gap-4 mb-8" role="list" aria-label="상위 3위 랭킹">
        {podiumOrder.map((user) => {
          const rank = user.rank;
          return (
            <div
              key={user.email}
              className="flex-1 flex flex-col items-center group"
              role="listitem"
              aria-label={`${rank}위 ${user.name} ${user.score.toLocaleString()}점`}
            >
              {/* 프로필 + 왕관 */}
              <div
                className={`relative mb-4 transition-transform duration-300 ${
                  rank === 1 ? "group-hover:scale-110" : "group-hover:scale-105"
                }`}
              >
                <div
                  className={`relative ${
                    rank === 1 ? "w-28 h-28" : "w-24 h-24"
                  } rounded-full overflow-hidden ring-4 ring-offset-4 ${getRingColor(rank)} shadow-2xl`}
                >
                  {user.profileImageUrl ? (
                    <Image
                      src={user.profileImageUrl}
                      alt={user.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${getRankGradient(rank)} flex items-center justify-center text-white font-bold ${
                        rank === 1 ? "text-4xl" : "text-3xl"
                      }`}
                      aria-hidden="true"
                    >
                      {user.name[0]}
                    </div>
                  )}
                </div>

                {/* 왕관/트로피 아이콘 */}
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 ${
                    rank === 1 ? "text-4xl" : "text-3xl"
                  } ${getIconColor(rank)}`}
                  aria-hidden="true"
                >
                  <FontAwesomeIcon icon={getRankIcon(rank)} />
                </div>
              </div>

              {/* 이름 + rankChange */}
              <h3
                className={`font-bold mb-1 ${rank === 1 ? "text-xl" : "text-lg"} text-gray-900`}
              >
                {user.name}
              </h3>
              <div className="mb-3">
                <RankChangeBadge change={user.rankChange} />
              </div>

              {/* 점수 */}
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faFire} className="text-orange-500" aria-hidden="true" />
                <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  {user.score.toLocaleString()}점
                </span>
              </div>

              {/* 시상대 블록 */}
              <div
                className={`w-full ${getPodiumHeight(rank)} bg-gradient-to-br ${getRankGradient(rank)} rounded-t-3xl shadow-2xl flex flex-col items-center justify-center transition-all duration-300 group-hover:shadow-3xl`}
                aria-hidden="true"
              >
                <div className="text-white font-bold text-4xl mb-1">{rank}</div>
                <div className="text-white/80 text-xs font-medium">
                  {user.score.toLocaleString()}점
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4등 이하 카드 리스트 */}
      {rest.length > 0 && (
        <ol className="space-y-3" aria-label="4위 이하 랭킹">
          {rest.map((user) => (
            <li
              key={user.email}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-lg"
              aria-label={`${user.rank}위 ${user.name} ${user.score.toLocaleString()}점`}
            >
              {/* 순위 */}
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-lg shrink-0"
                aria-hidden="true"
              >
                {user.rank}
              </div>

              {/* 프로필 이미지 */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-300 shrink-0">
                {user.profileImageUrl ? (
                  <Image src={user.profileImageUrl} alt={user.name} fill className="object-cover" />
                ) : (
                  <div
                    className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold"
                    aria-hidden="true"
                  >
                    {user.name[0]}
                  </div>
                )}
              </div>

              {/* 이름 + rankChange */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
                <div className="mt-0.5">
                  <RankChangeBadge change={user.rankChange} />
                </div>
              </div>

              {/* 점수 */}
              <div className="flex items-center gap-2 shrink-0">
                <FontAwesomeIcon icon={faFire} className="text-orange-500" aria-hidden="true" />
                <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 tabular-nums">
                  {user.score.toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
