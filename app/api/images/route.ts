import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

/**
 * 이미지 프록시 라우트 (GET /api/images)
 *
 * 브라우저의 <Image src> 요청은 커스텀 헤더를 추가할 수 없으므로,
 * Next.js API 라우트를 통해 백엔드로 요청을 프록시하면서
 * Authorization 헤더를 서버 사이드에서 추가합니다.
 *
 * 쿼리 파라미터:
 *   - filename: 이미지 파일명
 *   - type: POST | USER | THUMBNAIL
 *   - token: accessToken (클라이언트에서 전달)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filename = searchParams.get("filename");
  const type = searchParams.get("type") ?? "POST";
  const token = searchParams.get("token");

  if (!filename) {
    return NextResponse.json({ error: "filename 파라미터가 필요합니다." }, { status: 400 });
  }

  // 백엔드 이미지 URL 구성
  const backendUrl = `${API_BASE_URL}/files/images/view?filename=${encodeURIComponent(filename)}&type=${type}`;

  try {
    const headers: Record<string, string> = {};

    // accessToken이 전달된 경우 Authorization 헤더 추가
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(backendUrl, { headers });

    if (!response.ok) {
      return NextResponse.json(
        { error: "이미지를 불러올 수 없습니다." },
        { status: response.status },
      );
    }

    // 백엔드 응답의 이미지 데이터를 그대로 전달
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // 이미지 캐싱 설정 (1시간)
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Image Proxy] 요청 실패:", error);
    return NextResponse.json(
      { error: "이미지 프록시 요청 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
