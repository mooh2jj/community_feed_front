"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          /* 일반 토스트 — 포토오버/보더 색상을 프로젝트 토큰에 연결 */
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          /* rounded-2xl 수준으로 상향 */
          "--border-radius": "1rem",
          /* success — 파스텔 녹색 */
          "--success-bg": "#f0fdf4",
          "--success-border": "#bbf7d0",
          "--success-text": "#166534",
          /* error — 파스텔 빨강 */
          "--error-bg": "#fef2f2",
          "--error-border": "#fecaca",
          "--error-text": "#991b1b",
          /* warning — 파스텔 노란 */
          "--warning-bg": "#fffbeb",
          "--warning-border": "#fde68a",
          "--warning-text": "#92400e",
          /* 폰트 패밀리 통일 */
          "--font": "var(--font-pretendard, sans-serif)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
