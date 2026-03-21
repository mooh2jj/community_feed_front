import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { marked } from "marked"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// HTML 태그 포함 여부 감지 정규식 (Tiptap 출력 vs 마크다운 구분용)
const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i;

/**
 * HTML·마크다운 하이브리드 렌더러
 * - Tiptap 에디터가 생성한 HTML content → 그대로 반환
 * - PDF import API가 반환한 순수 마크다운 content → marked로 HTML로 변환
 */
export function renderContent(content: string): string {
  if (!content) return "";
  // HTML 태그가 포함되어 있으면 기존 HTML로 처리
  if (HTML_TAG_REGEX.test(content)) return content;
  // 순수 마크다운이면 HTML로 변환 (marked.parse는 동기 string 반환)
  return marked.parse(content) as string;
}
