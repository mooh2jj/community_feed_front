"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { postAPI, storage, fileAPI } from "@/lib/api";
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
          toast.error("파일 업로드에 실패했습니다");
          setIsSubmitting(false);
          return;
        }
      }

      // 2. 게시물 등록 (fileId 포함)
      await postAPI.createPost(userEmail, {
        content: content.trim(),
        fileId: fileId,
        visibility: "PUBLIC" as any, // 기본값: 공개
      });

      toast.success("✨ 게시물이 등록되었습니다!");
      router.push("/");
    } catch (error) {
      toast.error("게시물 등록에 실패했습니다");
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
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="오늘 무엇을 공부했나요?&#10;예: 알고리즘 3문제 풀이 완료! 🔥"
              className="min-h-[200px] text-base resize-none border-2 border-purple-200 focus:border-purple-500 rounded-2xl"
              maxLength={500}
            />
            <div className="text-right text-sm text-gray-500">
              {content.length} / 500
            </div>
          </div>

          {/* 제출 버튼 */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 text-lg font-bold rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-3d transition-all duration-300 hover:scale-105"
          >
            {isSubmitting ? "등록 중..." : "🎉 인증 완료!"}
          </Button>
        </form>
      </main>
    </div>
  );
}
