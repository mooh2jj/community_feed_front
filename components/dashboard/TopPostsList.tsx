"use client";

import Link from "next/link";
import Image from "next/image";
import { PostResponse } from "@/lib/types";
import { fileAPI } from "@/lib/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faHeart, faComment } from "@fortawesome/free-solid-svg-icons";

interface Props {
  posts: PostResponse[];
}

const RANK_MEDALS = ["🥇", "🥈", "🥉", "4위", "5위"];

/** HTML에서 첫 번째 h1 태그 텍스트를 추출하여 제목으로 사용 */
function extractTitle(html: string): string {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (match) return match[1].replace(/<[^>]+>/g, "").trim();
  // h1이 없으면 HTML을 제거하고 앞 40자 사용
  return html.replace(/<[^>]+>/g, "").trim().slice(0, 40) || "제목 없음";
}

/**
 * 내 인기 게시글 TOP 5
 * 조회수 × 1 + 좋아요 × 3 의 가중치 점수로 순위를 계산합니다.
 */
export default function TopPostsList({ posts }: Props) {
  const sorted = [...posts]
    .sort((a, b) => b.viewCount + b.likeCount * 3 - (a.viewCount + a.likeCount * 3))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      <h3 className="font-bold text-gray-900 mb-4">🏆 내 인기 게시글 TOP 5</h3>

      {sorted.length === 0 ? (
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
          {sorted.map((post, idx) => {
            const thumbUrl = post.imageUrl
              ? fileAPI.getImageUrl(post.imageUrl, "POST")
              : null;
            const title = extractTitle(post.content);

            return (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-purple-50 transition-colors group"
              >
                {/* 순위 */}
                <span className="text-xl w-8 text-center shrink-0">
                  {RANK_MEDALS[idx]}
                </span>

                {/* 썸네일 */}
                {thumbUrl && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    <Image src={thumbUrl} alt={title} fill className="object-cover" />
                  </div>
                )}

                {/* 제목 + 지표 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate group-hover:text-purple-700 transition-colors">
                    {title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faEye} className="text-green-500" />
                      {post.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faHeart} className="text-pink-500" />
                      {post.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faComment} className="text-orange-400" />
                      {post.commentCount}
                    </span>
                  </div>
                </div>

                {/* 점수 표시 */}
                <span className="shrink-0 text-xs text-gray-400 font-mono">
                  {post.viewCount + post.likeCount * 3}p
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
