"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faCrown,
  faMedal,
  faFire,
} from "@fortawesome/free-solid-svg-icons";
import { UserResponse } from "@/lib/types";

interface RankingPodiumProps {
  users: UserResponse[];
}

/**
 * 랭킹 시상대 컴포넌트
 * 상위 3명을 시상대 형식으로 표시
 */
export default function RankingPodium({ users }: RankingPodiumProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <FontAwesomeIcon icon={faTrophy} className="text-6xl mb-4 opacity-20" />
        <p>아직 랭킹 정보가 없습니다</p>
      </div>
    );
  }

  const topThree = users.slice(0, 3);
  // 시상대 순서: 2등 - 1등 - 3등
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  const getRankIcon = (index: number) => {
    if (index === 1) return faCrown; // 1등
    if (index === 0) return faTrophy; // 2등
    return faMedal; // 3등
  };

  const getRankColor = (index: number) => {
    if (index === 1) return "from-yellow-400 to-orange-500"; // 1등: 금색
    if (index === 0) return "from-gray-300 to-gray-400"; // 2등: 은색
    return "from-orange-300 to-yellow-600"; // 3등: 동색
  };

  const getPodiumHeight = (index: number) => {
    if (index === 1) return "h-56"; // 1등이 가장 높음
    if (index === 0) return "h-44"; // 2등
    return "h-36"; // 3등
  };

  const getRankNumber = (index: number) => {
    if (index === 1) return 1;
    if (index === 0) return 2;
    return 3;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 시상대 */}
      <div className="flex items-end justify-center gap-4 mb-8">
        {podiumOrder.map((user, idx) => {
          if (!user) return null;
          const rank = getRankNumber(idx);

          return (
            <div
              key={user.email}
              className="flex-1 flex flex-col items-center group"
            >
              {/* 프로필 */}
              <div
                className={`relative mb-4 transition-transform duration-300 ${
                  rank === 1 ? "group-hover:scale-110" : "group-hover:scale-105"
                }`}
              >
                <div
                  className={`relative ${
                    rank === 1 ? "w-28 h-28" : "w-24 h-24"
                  } rounded-full overflow-hidden ring-4 ring-offset-4 ${
                    rank === 1
                      ? "ring-yellow-400 ring-offset-yellow-100"
                      : rank === 2
                        ? "ring-gray-300 ring-offset-gray-100"
                        : "ring-orange-300 ring-offset-orange-100"
                  } shadow-2xl`}
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
                      className={`w-full h-full bg-gradient-to-br ${getRankColor(idx)} flex items-center justify-center text-white font-bold ${
                        rank === 1 ? "text-4xl" : "text-3xl"
                      }`}
                    >
                      {user.name[0]}
                    </div>
                  )}
                </div>

                {/* 왕관/트로피 아이콘 */}
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 ${
                    rank === 1 ? "text-4xl" : "text-3xl"
                  } ${
                    rank === 1
                      ? "text-yellow-400 animate-bounce"
                      : rank === 2
                        ? "text-gray-400"
                        : "text-orange-400"
                  }`}
                >
                  <FontAwesomeIcon icon={getRankIcon(idx)} />
                </div>
              </div>

              {/* 이름 */}
              <h3
                className={`font-bold mb-2 ${
                  rank === 1 ? "text-xl" : "text-lg"
                } text-gray-900`}
              >
                {user.name}
              </h3>

              {/* 점수 */}
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faFire} className="text-orange-500" />
                <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  {user.postCount * 10 + user.followerCount * 5}점
                </span>
              </div>

              {/* 시상대 */}
              <div
                className={`w-full ${getPodiumHeight(idx)} bg-gradient-to-br ${getRankColor(idx)} rounded-t-3xl shadow-2xl flex flex-col items-center justify-center transition-all duration-300 group-hover:shadow-3xl`}
              >
                <div className="text-white font-bold text-4xl mb-2">{rank}</div>
                <div className="text-white/80 text-sm">
                  게시물 {user.postCount}
                </div>
                <div className="text-white/80 text-sm">
                  팔로워 {user.followerCount}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4-5등 */}
      {users.length > 3 && (
        <div className="space-y-3">
          {users.slice(3, 5).map((user, idx) => (
            <div
              key={user.email}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-lg">
                {idx + 4}
              </div>

              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-300">
                {user.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={user.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                    {user.name[0]}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{user.name}</h4>
                <p className="text-sm text-gray-500">
                  게시물 {user.postCount} · 팔로워 {user.followerCount}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faFire} className="text-orange-500" />
                <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  {user.postCount * 10 + user.followerCount * 5}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
