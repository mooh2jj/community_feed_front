"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import { Button } from "@/components/ui/button";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TiptapEditor from "@/components/TiptapEditor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faHeart as faHeartSolid,
  faComment,
  faEye,
  faPaperPlane,
  faEdit,
  faTrash,
  faSave,
  faTimes,
  faImage,
  faCamera,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { PostResponse, CommentResponse } from "@/lib/types";
import { postAPI, commentAPI, storage, fileAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { uploadInlineImages } from "@/lib/imageUploadUtils";
import { renderContent } from "@/lib/utils";

/**
 * 게시물 상세 페이지
 * 좋아요, 댓글, 수정, 삭제 기능
 */
export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const postId = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // 수정 모드 에디터 내 미업로드 이미지 보관 (data URL → File)
  const editPendingFilesRef = useRef<Map<string, File>>(new Map());

  const [post, setPost] = useState<PostResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMyPost, setIsMyPost] = useState(false);

  // 게시글 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFilePreview, setEditFilePreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editHashtagInput, setEditHashtagInput] = useState(""); // 해시태그 수정
  // 에디터 강제 리마운트를 위한 key (수정 모드 진입 시마다 변경)
  const [editorKey, setEditorKey] = useState(0);

  // 댓글 수정 모드 상태
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  // 해시태그 클릭 핸들러 - # 제거 후 검색창에 입력
  const handleHashtagClick = (hashtag: string) => {
    const keyword = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag;
    router.push(`/?search=${encodeURIComponent(keyword)}`);
  };

  // 해시태그 추출 함수 (공백, 쉼표로 구분)
  const extractHashtags = (input: string): string[] => {
    if (!input.trim()) return [];

    return input
      .split(/[\s,]+/) // 공백이나 쉼표로 분리
      .map((tag) => {
        tag = tag.trim();
        // #이 없으면 자동으로 추가
        return tag && !tag.startsWith("#") ? `#${tag}` : tag;
      })
      .filter((tag) => tag.length > 1); // # 단독은 제외
  };

  // authLoading이 false가 된 시점(Auth 초기화 완료 후)에 데이터 로드
  // → 새로고침 시에도 user가 세팅된 상태로 API를 호출하므로
  //   isMyPost, isLiked 등 사용자 맞춤 데이터가 정확하게 초기화됨
  useEffect(() => {
    if (authLoading) return;
    loadPost();
    loadComments();
  }, [postId, authLoading]);

  // Syntax highlighting 적용
  useEffect(() => {
    if (contentRef.current && post && !isEditing) {
      const codeBlocks = contentRef.current.querySelectorAll("pre code");
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [post?.content, isEditing]);

  // URL 해시(#comment-{id})가 있으면 댓글 로드 후 해당 위치로 자동 스크롤
  useEffect(() => {
    if (comments.length === 0) return;
    const hash = window.location.hash; // ex) "#comment-42"
    if (!hash) return;

    // DOM 렌더링 완료 후 스크롤 (requestAnimationFrame으로 한 프레임 대기)
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(hash);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // 2초간 보라색 링 하이라이트 후 제거
      el.classList.add("ring-2", "ring-purple-400", "ring-offset-2");
      setTimeout(
        () => el.classList.remove("ring-2", "ring-purple-400", "ring-offset-2"),
        2000,
      );
    });

    return () => cancelAnimationFrame(raf);
  }, [comments]);

  const loadPost = async () => {
    try {
      const result = await postAPI.getPost(postId, user?.email);
      setPost(result.data);
      setEditContent(result.data.content);

      // 서버 응답의 liked 필드로 좋아요 상태 초기화
      setIsLiked(result.data.liked ?? false);

      // 내가 작성한 게시글인지 확인 (작성자 이메일과 현재 사용자 이메일 비교)
      setIsMyPost(!!user && result.data.authorEmail === user.email);
    } catch (error) {
      console.error("Failed to load post:", error);
      toast.error("게시물을 불러올 수 없습니다");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const result = await commentAPI.getComments(postId, user?.email);
      setComments(result.data.content);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      // 비로그인 사용자는 좋아요 불가
      if (!isAuthenticated) {
        toast.error("로그인이 필요합니다");
        router.push("/login");
        return;
      }

      if (isLiked) {
        await postAPI.unlikePost(postId);
        setPost({ ...post, likeCount: post.likeCount - 1 });
        setIsLiked(false);
        storage.setLikedPost(postId, false);
        toast.success("좋아요를 취소했습니다");
      } else {
        await postAPI.likePost(postId);
        setPost({ ...post, likeCount: post.likeCount + 1 });
        setIsLiked(true);
        storage.setLikedPost(postId, true);
        toast.success("❤️ 좋아요!");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "오류가 발생했습니다";

      // 서버 상태와 클라이언트 상태가 불일치한 경우
      // → UI를 서버 실제 상태로 보정 후 반대 동작 실행
      if (errorMessage.includes("이미 좋아요")) {
        try {
          await postAPI.unlikePost(postId);
          setPost({ ...post, likeCount: post.likeCount - 1 });
          setIsLiked(false);
          storage.setLikedPost(postId, false);
          toast.success("좋아요를 취소했습니다");
        } catch {
          toast.error("오류가 발생했습니다");
        }
      } else {
        toast.error(errorMessage);
        console.error("Like error:", error);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      toast.error("댓글을 입력해주세요");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await commentAPI.createComment(postId, {
        content: newComment.trim(),
      });

      setComments([...comments, result.data]);
      setNewComment("");

      if (post) {
        setPost({ ...post, commentCount: post.commentCount + 1 });
      }

      toast.success("댓글이 등록되었습니다");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "댓글 등록에 실패했습니다";
      toast.error(errorMessage);
      console.error("Comment error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 수정 모드로 전환
  const handleEditComment = (comment: CommentResponse) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  // 댓글 수정 취소
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentContent("");
  };

  // 댓글 수정 저장
  const handleUpdateComment = async (commentId: number) => {
    if (!editCommentContent.trim()) {
      toast.error("댓글 내용을 입력해주세요");
      return;
    }

    try {
      const result = await commentAPI.updateComment(commentId, {
        content: editCommentContent.trim(),
      });

      // 댓글 목록 업데이트
      setComments(comments.map((c) => (c.id === commentId ? result.data : c)));
      setEditingCommentId(null);
      setEditCommentContent("");
      toast.success("댓글이 수정되었습니다");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "댓글 수정에 실패했습니다";
      toast.error(errorMessage);
      console.error("Update comment error:", error);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = (commentId: number) => {
    toast("댓글을 삭제할까요?", {
      action: {
        label: "삭제",
        onClick: async () => {
          try {
            await commentAPI.deleteComment(commentId);
            setComments(comments.filter((c) => c.id !== commentId));
            if (post) {
              setPost({ ...post, commentCount: post.commentCount - 1 });
            }
            toast.success("댓글이 삭제되었습니다");
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "댓글 삭제에 실패했습니다";
            toast.error(errorMessage);
            console.error("Delete comment error:", error);
          }
        },
      },
      cancel: {
        label: "취소",
        onClick: () => {},
      },
    });
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다");
      return;
    }

    // 파일 크기 확인 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다");
      return;
    }

    setEditFile(file);

    // 미리보기
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 같은 파일 재선택 허용 (value 초기화)
    e.target.value = "";
  };

  // 수정 모드 이미지 제거 핸들러 (새로 선택한 파일만 취소, 기존 이미지 복원)
  const handleRemoveEditImage = () => {
    setEditFile(null);
    setEditFilePreview(null);
  };

  // 수정 모드로 전환
  const handleEditClick = () => {
    if (!post) return;
    // content를 먼저 설정한 뒤 key 변경으로 에디터를 강제 리마운트
    setEditContent(post.content);
    setEditFile(null);
    setEditFilePreview(null);
    // 해시태그가 있으면 로드
    if (post.hashtags && post.hashtags.length > 0) {
      setEditHashtagInput(post.hashtags.join(", "));
    } else {
      setEditHashtagInput("");
    }
    setEditorKey((prev) => prev + 1);
    setIsEditing(true);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(post?.content || "");
    setEditFile(null);
    setEditFilePreview(null);
    setEditHashtagInput("");
    // 취소 시 미업로드 이미지 파일 정리
    editPendingFilesRef.current.clear();
  };

  // 게시글 수정 저장
  const handleSaveEdit = async () => {
    if (!post || !editContent.trim()) {
      toast.error("내용을 입력해주세요");
      return;
    }

    setIsUpdating(true);
    try {
      let fileId: string | undefined;

      // 새 파일이 선택된 경우 업로드
      if (editFile) {
        const uploadResult = await fileAPI.uploadFile([editFile], "POST");
        if (uploadResult.data.successCount > 0) {
          fileId = uploadResult.data.successFileIds[0];
        }
      }

      // 에디터 내 인라인 이미지 업로드 후 서버 URL로 교체
      const finalContent = await uploadInlineImages(
        editContent,
        editPendingFilesRef.current,
      );

      // 게시글 수정
      const hashtags = extractHashtags(editHashtagInput);

      const result = await postAPI.updatePost(postId, {
        content: finalContent.trim(),
        uploadedFileId: fileId,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      });

      setPost(result.data);
      setIsEditing(false);
      setEditFile(null);
      setEditFilePreview(null);
      setEditHashtagInput("");
      toast.success("게시글이 수정되었습니다");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "게시글 수정에 실패했습니다";
      toast.error(errorMessage);
      console.error("Update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 게시글 삭제
  const handleDelete = () => {
    toast("게시글을 삭제할까요?", {
      description: "삭제된 게시글은 복구할 수 없습니다.",
      action: {
        label: "삭제",
        onClick: async () => {
          try {
            await postAPI.deletePost(postId);
            toast.success("게시글이 삭제되었습니다");
            router.push("/");
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "게시글 삭제에 실패했습니다";
            toast.error(errorMessage);
            console.error("Delete error:", error);
          }
        },
      },
      cancel: {
        label: "취소",
        onClick: () => {},
      },
    });
  };

  if (loading || !post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  // imageUrl이 있으면 백엔드 API 사용, 없으면 더미 이미지
  const displayImageUrl = post.imageUrl
    ? fileAPI.getImageUrl(post.imageUrl, "POST")
    : `https://picsum.photos/seed/${post.id}/1200/800`;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100">
        <div className="max-w-screen-lg mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              돌아가기
            </Button>
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-screen-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-xl overflow-hidden">
          {/* 이미지 - 항상 표시 (실제 이미지 또는 더미 이미지) */}
          <div className="relative aspect-video bg-purple-50">
            <Image
              src={displayImageUrl}
              alt={post.content}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              unoptimized={!!post.imageUrl}
            />
          </div>

          <div className="p-6 space-y-6">
            {/* 작성자 정보 & 수정/삭제 버튼 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-purple-400 ring-offset-2">
                  <Image
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.authorName}`}
                    alt={post.authorName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-gray-900">
                    {post.authorName}
                  </p>
                  <p className="text-sm text-gray-500">{timeAgo}</p>
                </div>
              </div>

              {/* 수정/삭제 버튼 (작성자만 표시) */}
              {isMyPost && !isEditing && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleEditClick}
                    variant="outline"
                    size="sm"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    <FontAwesomeIcon icon={faEdit} className="mr-1" />
                    수정
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-1" />
                    삭제
                  </Button>
                </div>
              )}
            </div>

            {/* 수정 모드 */}
            {isEditing ? (
              <div className="space-y-4 p-4 bg-purple-50 rounded-2xl">
                <TiptapEditor
                  key={editorKey}
                  content={editContent}
                  onChange={setEditContent}
                  placeholder="무슨 생각을 하고 계신가요?"
                  pendingFilesRef={editPendingFilesRef}
                />

                {/* 이미지 교체 - create 페이지와 동일한 호버 오버레이 방식 */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    📸 인증 사진
                  </Label>
                  <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-purple-300 hover:border-purple-500 transition-colors bg-purple-50/50">
                    {editFilePreview || post.imageUrl ? (
                      <>
                        {/* 새 미리보기 또는 기존 이미지 표시 */}
                        <img
                          src={
                            editFilePreview ??
                            fileAPI.getImageUrl(post.imageUrl!, "POST")
                          }
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        {/* 호버 오버레이 — 평소 숨김, 호버 시 등장 */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-800 font-semibold text-sm rounded-xl transition-colors"
                          >
                            <FontAwesomeIcon icon={faCamera} />
                            사진 교체
                          </button>
                          {/* 새 파일이 선택된 경우에만 '취소(원본 복원)' 버튼 표시 */}
                          {editFilePreview && (
                            <button
                              type="button"
                              onClick={handleRemoveEditImage}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition-colors"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              취소
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      /* 이미지가 없을 때 업로드 플레이스홀더 */
                      <label
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FontAwesomeIcon
                          icon={faImage}
                          className="text-4xl text-purple-300 mb-3"
                        />
                        <p className="text-purple-600 font-semibold text-sm">
                          사진 선택하기
                        </p>
                      </label>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* 해시태그 입력 */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    🏷️ 해시태그
                  </Label>
                  <Input
                    value={editHashtagInput}
                    onChange={(e) => setEditHashtagInput(e.target.value)}
                    placeholder="해시태그를 입력하세요 (예: 알고리즘 코딩테스트)"
                    className="border-2 border-purple-200 focus:border-purple-500 rounded-2xl"
                  />
                  <p className="text-xs text-gray-500">
                    💡 공백이나 쉼표로 구분하세요. #은 자동으로 추가됩니다.
                  </p>
                  {editHashtagInput.trim() && (
                    <div className="flex flex-wrap gap-2">
                      {extractHashtags(editHashtagInput).map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 수정 버튼 */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {isUpdating ? "저장 중..." : "저장"}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    variant="outline"
                    className="border-gray-300"
                  >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              /* 일반 모드 - 내용 */
              <>
                <div
                  ref={contentRef}
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: renderContent(post.content),
                  }}
                />

                {/* 해시태그 표시 */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.hashtags.map((tag, index) => (
                      <button
                        key={index}
                        onClick={() => handleHashtagClick(tag)}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 인터랙션 */}
            <div className="flex items-center gap-6 pt-4 border-t border-purple-100">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  isLiked
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/50"
                    : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600"
                }`}
              >
                <FontAwesomeIcon
                  icon={isLiked ? faHeartSolid : faHeartRegular}
                  className="text-lg"
                />
                <span className="font-semibold">{post.likeCount}</span>
              </button>

              <div className="flex items-center gap-2 text-gray-500">
                <FontAwesomeIcon icon={faComment} />
                <span className="font-semibold">{post.commentCount}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-500 ml-auto">
                <FontAwesomeIcon icon={faEye} />
                <span className="font-semibold">{post.viewCount}</span>
              </div>
            </div>

            {/* 댓글 작성 */}
            <form onSubmit={handleCommentSubmit} className="flex gap-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="응원의 댓글을 남겨주세요..."
                className="flex-1 min-h-[60px] resize-none border-2 border-purple-200 focus:border-purple-500 rounded-2xl"
                maxLength={200}
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 bg-purple-600 hover:bg-purple-700"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </Button>
            </form>

            {/* 댓글 목록 */}
            <div id="comments-section" className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  💬 댓글 {comments.length}개
                </h3>
              </div>

              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">아직 댓글이 없습니다.</p>
                  <p className="text-xs mt-1">첫 번째 댓글을 남겨보세요! 🎉</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const isMyComment =
                    !!user && comment.authorEmail === user.email;
                  const isEditingThisComment = editingCommentId === comment.id;

                  return (
                    <div
                      key={comment.id}
                      id={`comment-${comment.id}`}
                      className="flex gap-3 p-4 bg-purple-50/50 rounded-2xl transition-all duration-300"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-300 flex-shrink-0">
                        <Image
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.authorName}`}
                          alt={comment.authorName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">
                              {comment.authorName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(
                                new Date(comment.createdAt),
                                {
                                  addSuffix: true,
                                  locale: ko,
                                },
                              )}
                            </span>
                          </div>

                          {/* 내가 작성한 댓글인 경우 수정/삭제 버튼 표시 */}
                          {isMyComment && !isEditingThisComment && (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleEditComment(comment)}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                              >
                                <FontAwesomeIcon
                                  icon={faEdit}
                                  className="mr-1"
                                />
                                수정
                              </Button>
                              <Button
                                onClick={() => handleDeleteComment(comment.id)}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="mr-1"
                                />
                                삭제
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* 수정 모드 */}
                        {isEditingThisComment ? (
                          <div className="space-y-2 mt-2">
                            <Textarea
                              value={editCommentContent}
                              onChange={(e) =>
                                setEditCommentContent(e.target.value)
                              }
                              className="min-h-[60px] resize-none border-2 border-purple-200 focus:border-purple-500 rounded-xl text-sm"
                              maxLength={200}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleUpdateComment(comment.id)}
                                size="sm"
                                className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700"
                              >
                                <FontAwesomeIcon
                                  icon={faSave}
                                  className="mr-1"
                                />
                                저장
                              </Button>
                              <Button
                                onClick={handleCancelEditComment}
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs border-gray-300"
                              >
                                <FontAwesomeIcon
                                  icon={faTimes}
                                  className="mr-1"
                                />
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* 일반 모드 */
                          <p className="text-sm text-gray-700">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
