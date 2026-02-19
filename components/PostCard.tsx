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
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface PostCardProps {
  post: PostResponse;
  onLikeChange?: () => void;
}

/**
 * 게시물 카드 컴포넌트
 * 3D 그림자와 애니메이션이 있는 매력적인 디자인
 */
export default function PostCard({ post, onLikeChange }: PostCardProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const likedPosts = storage.getLikedPosts();
    setIsLiked(likedPosts.has(post.id));
  }, [post.id]);

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
    router.push(`/?search=${encodeURIComponent(hashtag)}`);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const currentUserEmail = storage.getCurrentUserEmail();
    setIsLoading(true);

    try {
      if (isLiked) {
        await postAPI.unlikePost(post.id, currentUserEmail);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
        storage.setLikedPost(post.id, false);
        toast.success("좋아요를 취소했습니다");
      } else {
        await postAPI.likePost(post.id, currentUserEmail);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        storage.setLikedPost(post.id, true);
        toast.success("❤️ 좋아요!");
      }
      onLikeChange?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "오류가 발생했습니다";
      toast.error(errorMessage);
      console.error("Like error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  // imageUrl이 있으면 백엔드 API 사용, 없으면 더미 이미지
  const displayImageUrl = post.imageUrl
    ? fileAPI.getImageUrl(post.imageUrl, "POST")
    : `https://picsum.photos/seed/${post.id}/800/800`;

  return (
    <Link href={`/post/${post.id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 border-2 border-purple-100 hover:border-purple-300 bg-gradient-to-br from-white to-purple-50/30 flex flex-col">
        {/* 이미지 - 항상 표시 (실제 이미지 또는 더미 이미지) */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100">
          <Image
            src={displayImageUrl}
            alt={post.content}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={!!post.imageUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="p-4 space-y-3 h-[280px] flex flex-col">
          {/* 작성자 정보 */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-400 ring-offset-2">
              <Image
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.authorName}`}
                alt={post.authorName}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">
                {post.authorName}
              </p>
              <p className="text-xs text-gray-500">{timeAgo}</p>
            </div>
          </div>

          {/* 내용 */}
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none text-sm text-gray-700 line-clamp-3 leading-relaxed flex-1"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* 해시태그 */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {post.hashtags.slice(0, 3).map((tag, index) => (
                <button
                  key={index}
                  onClick={(e) => handleHashtagClick(e, tag)}
                  className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors h-fit"
                >
                  {tag}
                </button>
              ))}
              {post.hashtags.length > 3 && (
                <span className="px-2 py-0.5 text-purple-600 text-xs font-medium">
                  +{post.hashtags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* 인터랙션 */}
          <div className="flex items-center gap-4 pt-2 mt-auto">
            <button
              onClick={handleLike}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                isLiked
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
                  : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600"
              }`}
            >
              <FontAwesomeIcon
                icon={isLiked ? faHeartSolid : faHeartRegular}
                className={`text-sm ${isLiked ? "animate-pulse" : ""}`}
              />
              <span className="text-sm font-semibold">{likeCount}</span>
            </button>

            <div className="flex items-center gap-2 text-gray-500">
              <FontAwesomeIcon icon={faComment} className="text-sm" />
              <span className="text-sm">{post.commentCount}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-500 ml-auto">
              <FontAwesomeIcon icon={faEye} className="text-sm" />
              <span className="text-sm">{post.viewCount}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
