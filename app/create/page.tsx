"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import TiptapEditor from "@/components/TiptapEditor";
import {
  faImage,
  faArrowLeft,
  faCamera,
  faTrash,
  faFile,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { postAPI, fileAPI, aiAPI } from "@/lib/api";
import { uploadInlineImages } from "@/lib/imageUploadUtils";
import { toast } from "sonner";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";

/**
 * 게시물 작성 페이지 (인증 필요)
 */
export default function CreatePostPage() {
  return (
    <AuthGuard>
      <CreatePost />
    </AuthGuard>
  );
}

function CreatePost() {
  const router = useRouter();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hashtagInput, setHashtagInput] = useState(""); // 해시태그 입력

  // 에디터 내 미업로드 이미지 파일 보관 (data URL → File)
  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  // 인증 사진 파일 input ref (교체 시 click() 호출용)
  const imageInputRef = useRef<HTMLInputElement>(null);
  // PDF 업로드 파일 input ref
  const pdfInputRef = useRef<HTMLInputElement>(null);
  // PDF AI 자동 등록 중 로딩 상태
  const [isPdfUploading, setIsPdfUploading] = useState(false);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // 같은 파일 재선택 허용 (value 초기화)
    e.target.value = "";
  };

  // 선택한 인증 사진 제거
  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
  };

  /**
   * PDF 파일 선택 후 AI import API로 게시글 자동 등록
   * - multipart/form-data로 파일 전송
   * - 성공 시 toast 포토 후 홈으로 이동
   */
  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 입력값 리셋 (동일 파일 재선택 허용)
    e.target.value = "";

    // PDF 파일 여부 컴체크
    if (file.type !== "application/pdf") {
      toast.error("PDF 파일만 업로드할 수 있습니다");
      return;
    }

    setIsPdfUploading(true);
    try {
      // 해시태그 추출 (기존 hashtagInput 사용)
      const hashtags = extractHashtags(hashtagInput);
      const result = await aiAPI.importPdf(
        file,
        "PUBLIC",
        hashtags.length > 0 ? hashtags : undefined,
      );

      if (result.success) {
        toast.success("📄 PDF가 게시글로 등록되었습니다!");
        router.push("/");
      } else {
        toast.error(result.message ?? "PDF 등록에 실패했습니다");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "PDF 등록 중 오류가 발생했습니다";
      toast.error(msg);
    } finally {
      setIsPdfUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("내용을 입력해주세요");
      return;
    }

    // 첫 번째 블록이 H1 제목인지 확인 (Tiptap은 # 제목을 <h1>로 출력)
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const firstBlock = doc.body.firstElementChild;
    if (!firstBlock || firstBlock.tagName.toLowerCase() !== "h1") {
      toast.error("첫 번째 줄은 반드시 제목 1(# 제목)로 시작해야 합니다");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileId: string | undefined;

      // 1. 파일이 선택된 경우, 먼저 파일 업로드
      if (selectedFile) {
        try {
          const uploadResponse = await fileAPI.uploadFile(
            [selectedFile],
            "POST",
          );

          if (
            uploadResponse.success &&
            uploadResponse.data.successFileIds.length > 0
          ) {
            // 첫 번째 파일 ID 추출
            fileId = uploadResponse.data.successFileIds[0];
            console.log("📤 파일 업로드 성공 - fileId:", fileId);
          } else {
            throw new Error("파일 업로드에 실패했습니다");
          }
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          const errorMessage =
            uploadError instanceof Error
              ? uploadError.message
              : "파일 업로드에 실패했습니다";
          toast.error(errorMessage);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. 에디터 내 인라인 이미지 업로드 후 서버 URL로 교체
      const finalContent = await uploadInlineImages(
        content,
        pendingFilesRef.current,
      );

      // 3. 게시물 등록 (fileId 포함)
      const hashtags = extractHashtags(hashtagInput);

      await postAPI.createPost({
        content: finalContent.trim(),
        fileId: fileId,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        visibility: "PUBLIC" as any,
      });

      toast.success("✨ 게시물이 등록되었습니다!");
      router.push("/");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "게시물 등록에 실패했습니다";
      toast.error(errorMessage);
      console.error("Post creation error:", error);
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-lg font-bold gradient-text">스터디 인증하기</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-screen-lg mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* PDF AI 자동 등록 섹션 */}
          <div className="rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <FontAwesomeIcon
                icon={faFile}
                className="text-4xl text-indigo-400"
              />
              <div>
                <p className="font-semibold text-gray-800">
                  🤖 PDF로 게시글 자동 등록
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF를 업로드하면 AI가 파싱하여 게시글을 자동으로 등록합니다
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isPdfUploading}
                onClick={() => pdfInputRef.current?.click()}
                className="border-2 border-indigo-400 text-indigo-600 hover:bg-indigo-100 rounded-2xl px-6"
              >
                {isPdfUploading ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="mr-2 animate-spin"
                    />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faFile} className="mr-2" />
                    PDF 파일 선택
                  </>
                )}
              </Button>
              {/* 해시태그 사용 안내 */}
              <p className="text-xs text-indigo-500">
                아래 해시태그 입력 시 PDF 게시글에도 적용됩니다
              </p>
            </div>
            {/* 숨겨진 PDF input */}
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfImport}
            />
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-purple-200" />
            <span className="text-xs text-gray-400 shrink-0">or 직접 게시글 작성</span>
            <div className="flex-1 border-t border-purple-200" />
          </div>
          {/* 이미지 업로드 */}
          <div className="space-y-2">
            <Label
              htmlFor="image"
              className="text-sm font-semibold text-gray-700"
            >
              📸 인증 사진
            </Label>
            <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-dashed border-purple-300 hover:border-purple-500 transition-colors bg-purple-50/50">
              {imagePreview ? (
                <>
                  {/* 미리보기 이미지 */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {/* 호버 오버레이 — 평소에는 숨겨지고 호버 시에만 등장 */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-800 font-semibold text-sm rounded-xl transition-colors"
                    >
                      <FontAwesomeIcon icon={faCamera} />
                      사진 교체
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      제거
                    </button>
                  </div>
                </>
              ) : (
                <label
                  htmlFor="image"
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                >
                  <FontAwesomeIcon
                    icon={faImage}
                    className="text-6xl text-purple-300 mb-4"
                  />
                  <p className="text-purple-600 font-semibold">사진 선택하기</p>
                  <p className="text-sm text-gray-500 mt-2">
                    스터디 인증 사진을 올려주세요
                  </p>
                </label>
              )}
              <Input
                ref={imageInputRef}
                id="image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* 내용 입력 */}
          <div className="space-y-2">
            <Label
              htmlFor="content"
              className="text-sm font-semibold text-gray-700"
            >
              📝 스터디 기록
            </Label>
            {/* H1 제목 필수 안내 */}
            {/* <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-700">
              <span className="font-bold text-indigo-600">필수</span>
              <span>
                첫 번째 줄은{" "}
                <code className="bg-white border border-indigo-200 rounded px-1 font-mono">
                  # 제목
                </code>{" "}
                (H1) 으로 시작해야 합니다
              </span>
            </div> */}
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="# 제목을 입력하세요 (필수!)&#10;&#10;오늘 무엇을 인증할까요?"
              pendingFilesRef={pendingFilesRef}
            />
            {/* 마크다운 단축키 힌트 */}
            <div className="rounded-2xl bg-purple-50 border border-purple-100 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-purple-700">
                💡 마크다운 단축키 — 입력 후{" "}
                <kbd className="bg-white border border-purple-200 rounded px-1 text-purple-600">
                  Space
                </kbd>{" "}
                를 누르세요!
              </p>

              {/* 제목 */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wide">
                  제목
                </p>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-600">
                  {[
                    { key: "#", label: "제목 1" },
                    { key: "##", label: "제목 2" },
                    { key: "###", label: "제목 3" },
                  ].map(({ key, label }) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <code className="bg-white border border-purple-200 rounded px-1 text-purple-600 shrink-0">
                        {key}
                      </code>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* 텍스트 서식 */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wide">
                  텍스트 서식
                </p>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-600">
                  {[
                    { key: "**텍스트**", label: "굵게" },
                    { key: "*텍스트*", label: "기울임" },
                    { key: "`코드`", label: "인라인 코드" },
                  ].map(({ key, label }) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <code className="bg-white border border-purple-200 rounded px-1 text-purple-600 shrink-0">
                        {key}
                      </code>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* 목록 / 인용 / 코드블록 */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wide">
                  목록 · 인용 · 코드
                </p>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-600">
                  {[
                    { key: "- 항목", label: "불릿 목록" },
                    { key: "* 항목", label: "불릿 목록" },
                    { key: "> 텍스트", label: "인용문" },
                    { key: "```", label: "코드 블록" },
                  ].map(({ key, label }) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <code className="bg-white border border-purple-200 rounded px-1 text-purple-600 shrink-0">
                        {key}
                      </code>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 해시태그 입력 */}
          <div className="space-y-2">
            <Label
              htmlFor="hashtags"
              className="text-sm font-semibold text-gray-700"
            >
              🏷️ 해시태그
            </Label>
            <Input
              id="hashtags"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              placeholder="해시태그를 입력하세요 (예: 알고리즘 코딩테스트 or #알고리즘, #코딩테스트)"
              className="border-2 border-purple-200 focus:border-purple-500 rounded-2xl"
            />
            <p className="text-xs text-gray-500">
              💡 공백이나 쉼표로 구분하세요. #은 자동으로 추가됩니다.
            </p>
            {hashtagInput.trim() && (
              <div className="flex flex-wrap gap-2 mt-2">
                {extractHashtags(hashtagInput).map((tag, index) => (
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

          {/* 제출 버튼 */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 text-lg font-bold rounded-2xl bg-purple-600 hover:bg-purple-700 shadow-3d transition-all duration-300 hover:scale-105"
          >
            {isSubmitting ? "등록 중..." : "🎉 인증 완료!"}
          </Button>
        </form>
      </main>
    </div>
  );
}
