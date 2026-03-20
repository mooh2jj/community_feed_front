"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// 언어 등록
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("css", css);

import {
  faHeart as faHeartSolid,
  faComment,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { Card } from "@/components/ui/card";
import { PostResponse } from "@/lib/types";
import { postAPI, storage, fileAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import FollowButton from "@/components/FollowButton";

interface PostListItemProps {
  post: PostResponse;
  onLikeChange?: () => void;
}

/**
 * 리스트 뷰 전용 게시물 카드 컴포넌트
 * 가로 배치(썸네일 + 본문)로 페이지네이션 목록에 최적화
 */
export default function PostListItem({
  post,
  onLikeChange,
}: PostListItemProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  // 서버 응답의 liked 필드를 우선 사용
  const [isLiked, setIsLiked] = useState(post.liked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // post 데이터 변경 시(리페치 등) 서버 값으로 동기화
  useEffect(() => {
    setIsLiked(post.liked ?? false);
    setLikeCount(post.likeCount);
  }, [post.id, post.liked, post.likeCount]);

  // Syntax highlighting 적용
  useEffect(() => {
    if (contentRef.current) {
      const codeBlocks = contentRef.current.querySelectorAll("pre code");
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [post.content]);

  // 해시태그 클릭 핸들러
  const handleHashtagClick = (e: React.MouseEvent, hashtag: string) => {
    e.preventDefault();
    e.stopPropagation();
    const keyword = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;
    router.push(`/?search=${encodeURIComponent(keyword)}`);
  };

  // 좋아요 토글
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // 비로그인 사용자는 좋아요 불가
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    setIsLoading(true);

    try {
      if (isLiked) {
        await postAPI.unlikePost(post.id);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
        storage.setLikedPost(post.id, false);
        toast.success("좋아요를 취소했습니다");
      } else {
        await postAPI.likePost(post.id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        storage.setLikedPost(post.id, true);
        toast.success("❤️ 좋아요!");
      }
      onLikeChange?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "오류가 발생했습니다";

      // 서버 상태와 클라이언트 상태가 불일치한 경우 (상세 페이지에서 좋아요 후 목록 복귀 등)
      // → UI를 서버 실제 상태로 보정 후 반대 동작 실행
      if (errorMessage.includes("이미 좋아요")) {
        try {
          await postAPI.unlikePost(post.id);
          setIsLiked(false);
          setLikeCount((prev) => prev - 1);
          storage.setLikedPost(post.id, false);
          toast.success("좋아요를 취소했습니다");
          onLikeChange?.();
        } catch {
          toast.error("오류가 발생했습니다");
        }
      } else {
        toast.error(errorMessage);
        console.error("Like error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  const displayImageUrl = post.imageUrl
    ? fileAPI.getImageUrl(post.imageUrl, "POST")
    : `https://picsum.photos/seed/${post.id}/400/400`;

  return (
    <Link href={`/post/${post.id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-0.5 border-2 border-purple-100 hover:border-purple-300 bg-white">
        <div className="flex flex-col sm:flex-row">
          {/* 왼쪽 썸네일 */}
          <div className="relative w-full sm:w-48 md:w-56 shrink-0 aspect-video sm:aspect-square overflow-hidden bg-linear-to-br from-purple-100 to-pink-100">
            {!imageLoaded && (
              <div className="absolute inset-0 z-10 bg-linear-to-br from-purple-100 to-pink-100 animate-pulse" />
            )}
            <Image
              src={displayImageUrl}
              alt={post.content}
              fill
              className={`object-cover transition-all duration-500 group-hover:scale-105 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 640px) 100vw, 224px"
              unoptimized={!!post.imageUrl}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* 오른쪽 컨텐츠 */}
          <div className="flex-1 p-4 flex flex-col gap-2.5 min-w-0">
            {/* 작성자 + 시간 */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-purple-300 ring-offset-1 shrink-0">
                <Image
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.authorName}`}
                  alt={post.authorName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-semibold text-sm text-gray-900 truncate">
                  {post.authorName}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {timeAgo}
                </span>
              </div>
              {post.authorEmail && (
                <FollowButton
                  targetEmail={post.authorEmail}
                  initialIsFollowing={post.isFollowing ?? false}
                />
              )}
            </div>

            {/* 본문 미리보기 */}
            <div
              ref={contentRef}
              className="prose prose-sm max-w-none text-sm text-gray-700 line-clamp-2 leading-relaxed flex-1"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* 해시태그 */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.slice(0, 4).map((tag, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleHashtagClick(e, tag)}
                    className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
                {post.hashtags.length > 4 && (
                  <span className="px-2 py-0.5 text-purple-600 text-xs font-medium">
                    +{post.hashtags.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* 인터랙션 (좋아요 · 댓글 · 조회수) */}
            <div className="flex items-center gap-4 pt-1 mt-auto">
              <button
                onClick={handleLike}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-300 text-xs ${
                  isLiked
                    ? "bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/40"
                    : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600"
                }`}
              >
                <FontAwesomeIcon
                  icon={isLiked ? faHeartSolid : faHeartRegular}
                  className={isLiked ? "animate-pulse" : ""}
                />
                <span className="font-semibold">{likeCount}</span>
              </button>

              <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                <FontAwesomeIcon icon={faComment} />
                <span>{post.commentCount}</span>
              </div>

              <div className="flex items-center gap-1.5 text-gray-500 text-xs ml-auto">
                <FontAwesomeIcon icon={faEye} />
                <span>{post.viewCount}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
