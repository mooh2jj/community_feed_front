import { fileAPI } from "@/lib/api";

/**
 * HTML 컨텐츠 내의 data: URL 이미지를 서버에 일괄 업로드하고
 * 서버 접근 URL로 교체한 최종 HTML을 반환한다.
 *
 * 에디터에서 이미지를 삽입하면 data: URL(base64)로 임시 저장되고,
 * 게시 버튼을 누를 때 이 함수를 호출해 실제 업로드를 처리한다.
 *
 * @param html - TiptapEditor가 출력한 HTML 문자열
 * @param pendingFiles - data URL → File 매핑 (TiptapEditor 내부에서 관리)
 * @returns 서버 이미지 URL이 적용된 최종 HTML
 */
export async function uploadInlineImages(
  html: string,
  pendingFiles: Map<string, File>,
): Promise<string> {
  // 업로드할 파일이 없으면 그대로 반환
  if (pendingFiles.size === 0) return html;

  // DOMParser는 클라이언트 전용 API (client component에서만 호출)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // data: URL을 src로 가진 이미지만 추출
  const pendingImages = Array.from(
    doc.querySelectorAll<HTMLImageElement>("img"),
  ).filter((img) => {
    const src = img.getAttribute("src") ?? "";
    return src.startsWith("data:") && pendingFiles.has(src);
  });

  if (pendingImages.length === 0) return html;

  // 순차 업로드 (서버 부하 최소화)
  for (const img of pendingImages) {
    const dataUrl = img.getAttribute("src")!;
    const file = pendingFiles.get(dataUrl)!;

    const result = await fileAPI.uploadFile([file], "POST");

    if (!result.success || result.data.successFileNames.length === 0) {
      throw new Error(`이미지 업로드 실패: ${file.name}`);
    }

    // 서버 접근 URL로 src 교체
    const serverUrl = fileAPI.getImageUrl(
      result.data.successFileNames[0],
      "POST",
    );
    img.setAttribute("src", serverUrl);
    pendingFiles.delete(dataUrl);
  }

  // <html><head><body> 래퍼 제거 후 innerHTML만 반환
  return doc.body.innerHTML;
}
