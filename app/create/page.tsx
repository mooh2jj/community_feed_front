"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import TiptapEditor from "@/components/TiptapEditor";
import { faImage, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { postAPI, storage, fileAPI } from "@/lib/api";
import { uploadInlineImages } from "@/lib/imageUploadUtils";
import { toast } from "sonner";
import Link from "next/link";

/**
 * 게시물 작성 페이지
 */
export default function CreatePost() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hashtagInput, setHashtagInput] = useState(""); // 해시태그 입력

  // 에디터 내 미업로드 이미지 파일 보관 (data URL → File)
  const pendingFilesRef = useRef<Map<string, File>>(new Map());

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
      // 파일 저장
      setSelectedFile(file);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("내용을 입력해주세요");
      return;
    }

    setIsSubmitting(true);
    const userEmail = storage.getCurrentUserEmail();

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

      await postAPI.createPost(userEmail, {
        content: finalContent.trim(),
        fileId: fileId,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        visibility: "PUBLIC" as any, // 기본값: 공개
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
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
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
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="오늘 무엇을 공부했나요?&#10;예: 알고리즘 3문제 풀이 완료! 🔥"
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
