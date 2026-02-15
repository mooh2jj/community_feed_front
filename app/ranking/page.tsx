"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RankingPodium from "@/components/RankingPodium";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { userAPI } from "@/lib/api";
import { UserResponse } from "@/lib/types";
import Link from "next/link";

/**
 * 랭킹 페이지
 * 상위 5명 시상대 형식
 */
export default function RankingPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await userAPI.getUsers();
      // 점수 계산 후 정렬 (게시물 * 10 + 팔로워 * 5)
      const sortedUsers = result.data.sort((a, b) => {
        const scoreA = a.postCount * 10 + a.followerCount * 5;
        const scoreB = b.postCount * 10 + b.followerCount * 5;
        return scoreB - scoreA;
      });
      setUsers(sortedUsers.slice(0, 5));
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100">
        <div className="max-w-screen-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              돌아가기
            </Button>
          </Link>
          <h1 className="text-lg font-bold gradient-text">🏆 랭킹</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-screen-lg mx-auto px-4 py-8">
        {/* 타이틀 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 shadow-3d animate-float">
            <FontAwesomeIcon icon={faTrophy} className="text-4xl text-white" />
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-2">
            이번 주 스터디 챔피언
          </h2>
          <p className="text-gray-600">
            꾸준한 노력으로 빛나는 여러분을 응원합니다! 🎉
          </p>
        </div>

        {/* 랭킹 시상대 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">랭킹을 불러오는 중...</p>
          </div>
        ) : (
          <RankingPodium users={users} />
        )}

        {/* 하단 설명 */}
        <div className="mt-12 p-6 bg-white rounded-3xl border-2 border-purple-100 shadow-lg">
          <h3 className="font-bold text-lg mb-3 gradient-text">
            📊 점수 계산 방식
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              게시물 1개 = 10점
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              팔로워 1명 = 5점
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              매주 월요일 자정 랭킹 초기화
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
