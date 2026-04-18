"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { dashboardAPI } from "@/lib/api";
import { TopPostDto } from "@/lib/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faHeart, faComment } from "@fortawesome/free-solid-svg-icons";

type Metric = "views" | "likes";

const RANK_MEDALS = ["🥇", "🥈", "🥉", "4위", "5위"];

/**
 * 내 인기 게시글 TOP 5
 * - 조회수/좋아요 탭 전환 시 dashboardAPI.getTopPosts 재호출
 * - contentPreview 는 서버에서 HTML 태그 제거 후 80자 잘라 반환
 */
export default function TopPostsList() {
  const [metric, setMetric] = useState<Metric>("views");
  const [posts, setPosts] = useState<TopPostDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await dashboardAPI.getTopPosts(metric, 5);
        if (!cancelled && res.success) setPosts(res.data.posts ?? []);
      } catch {
        // 조용히 처리
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [metric]);

  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      {/* 헤더 + 탭 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">🏆 내 인기 게시글 TOP 5</h3>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["views", "likes"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                metric === m
                  ? "bg-white text-purple-700 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "views" ? "👁 조회" : "❤️ 좋아요"}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 스켈레톤 */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="w-8 h-5 bg-gray-100 rounded animate-pulse shrink-0" />
              <div className="flex-1 h-5 bg-gray-100 rounded animate-pulse" />
              <div className="w-12 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">📝</p>
          <p className="text-sm">아직 게시글이 없습니다.</p>
          <Link
            href="/create"
            className="text-purple-600 text-sm font-medium hover:underline mt-2 block"
          >
            첫 게시글 작성하기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post, idx) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-purple-50 transition-colors group"
            >
              {/* 순위 */}
              <span className="text-xl w-8 text-center shrink-0">
                {RANK_MEDALS[idx] ?? `${idx + 1}위`}
              </span>

              {/* 미리보기 + 지표 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate group-hover:text-purple-700 transition-colors">
                  {post.contentPreview || "내용 없음"}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faEye} className="text-green-500" />
                    {post.viewCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faHeart} className="text-pink-500" />
                    {post.likeCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faComment} className="text-orange-400" />
                    {post.commentCount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 주요 지표 강조 */}
              <span className="shrink-0 text-xs font-bold text-purple-600 tabular-nums">
                {metric === "views"
                  ? `${post.viewCount.toLocaleString()}v`
                  : `${post.likeCount.toLocaleString()}♥`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
