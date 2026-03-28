"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { postAPI } from "@/lib/api";
import { WeeklyPopularPost } from "@/lib/types";

/** 순위에 따른 메달 스타일 (1~3위: 금·은·동, 나머지: 회색) */
const RANK_STYLES: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-yellow-100", text: "text-yellow-600" },
  2: { bg: "bg-gray-200", text: "text-gray-500" },
  3: { bg: "bg-orange-100", text: "text-orange-500" },
};

const getRankStyle = (rank: number) =>
  RANK_STYLES[rank] ?? { bg: "bg-gray-100", text: "text-gray-400" };

/**
 * 이번 주 인기글 사이드바 카드
 * - /posts/popular/weekly?limit=5 에서 상위 5개 인기글 조회
 * - 인기 태그 카드와 동일한 카드 디자인
 * - 순위 배지 + 내용 미리보기 + 작성자 표시
 */
export default function WeeklyPopularSidebar() {
  const [posts, setPosts] = useState<WeeklyPopularPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postAPI
      .getWeeklyPopular(3)
      .then((res) => setPosts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── 로딩 스켈레톤 ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2">
              {/* 순위 배지 스켈레톤 */}
              <div
                className="w-5 h-5 rounded-full bg-gray-100 animate-pulse shrink-0 mt-0.5"
                style={{ animationDelay: `${i * 60}ms` }}
              />
              <div className="flex-1 space-y-1">
                <div
                  className="h-3 bg-gray-100 rounded animate-pulse"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
                <div
                  className="h-3 w-2/3 bg-gray-100 rounded animate-pulse"
                  style={{ animationDelay: `${i * 60 + 30}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* 카드 헤더 */}
      <h3 className="text-sm font-bold text-gray-800 mb-3">이번 주 BEST 글</h3>

      {/* 인기글 목록 */}
      <ul className="space-y-3">
        {posts.map((post) => {
          const { bg, text } = getRankStyle(post.rank);

          return (
            <li key={post.rank}>
              <Link
                href={`/post/${post.postId}`}
                className="flex items-start gap-2 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
              >
                {/* 순위 배지 */}
                <span
                  className={`
                    shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                    text-[10px] font-bold mt-0.5
                    ${bg} ${text}
                  `}
                >
                  {post.rank}
                </span>

                {/* 글 내용 + 작성자 */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-snug line-clamp-2 group-hover:text-purple-700">
                    {post.content}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {post.authorName}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
