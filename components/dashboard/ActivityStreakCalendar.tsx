"use client";

import { format, subDays, isToday } from "date-fns";
import { PostResponse } from "@/lib/types";

interface Props {
  posts: PostResponse[];
}

// ─── 데이터 계산 헬퍼 ────────────────────────────────────────────────────────

/** 최근 84일(12주) 캘린더 데이터 생성 */
function buildCalendar(posts: PostResponse[]): { date: Date; count: number }[] {
  const countMap = new Map<string, number>();
  for (const post of posts) {
    const d = post.createdAt.slice(0, 10);
    countMap.set(d, (countMap.get(d) ?? 0) + 1);
  }

  return Array.from({ length: 84 }, (_, i) => {
    const date = subDays(new Date(), 83 - i);
    const key = format(date, "yyyy-MM-dd");
    return { date, count: countMap.get(key) ?? 0 };
  });
}

/** 현재 연속 작성 일수와 최장 스트릭 계산 */
function computeStreak(posts: PostResponse[]): { current: number; longest: number } {
  if (posts.length === 0) return { current: 0, longest: 0 };

  const dateSet = new Set(posts.map((p) => p.createdAt.slice(0, 10)));

  // 오늘 게시글이 없으면 어제부터 현재 스트릭 계산 (당일 유예)
  let cursor = new Date();
  if (!dateSet.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = subDays(cursor, 1);
  }

  let current = 0;
  while (dateSet.has(format(cursor, "yyyy-MM-dd"))) {
    current++;
    cursor = subDays(cursor, 1);
  }

  // 최장 스트릭: 정렬된 날짜 배열을 순회하며 연속 일수 계산
  const sorted = Array.from(dateSet).sort();
  let longest = current;
  let streak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);

    if (diffDays === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest };
}

// ─── 색상 강도 매핑 ──────────────────────────────────────────────────────────

function getCellColor(count: number): string {
  if (count === 0) return "bg-gray-100";
  if (count === 1) return "bg-purple-200";
  if (count === 2) return "bg-purple-400";
  return "bg-purple-600";
}

// ─── ActivityStreakCalendar 컴포넌트 ─────────────────────────────────────────

/**
 * 스터디 스트릭 캘린더
 * GitHub Contribution Graph 스타일 — 최근 84일(12주)을 주 단위 그리드로 표시합니다.
 * 보라색 농도가 진할수록 해당 날의 게시글 수가 많습니다.
 */
export default function ActivityStreakCalendar({ posts }: Props) {
  const days = buildCalendar(posts);
  const { current, longest } = computeStreak(posts);

  // 84일을 12주로 분할 (각 주 = 7일)
  const weeks: { date: Date; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-gray-900">🔥 스터디 스트릭</h3>
        <div className="flex gap-4 text-sm">
          <span className="text-orange-500 font-bold">현재 {current}일 연속</span>
          <span className="text-gray-400">최장 {longest}일</span>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {/* 요일 레이블 열 */}
          <div className="flex flex-col gap-1 mr-1">
            <div className="h-5" /> {/* 월 레이블 공간 */}
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="w-5 h-5 flex items-center justify-end text-[10px] text-gray-400 pr-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* 주 단위 열 */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {/* 해당 주 첫 날이 해당 월의 1~7일이면 월 레이블 표시 */}
              <div className="h-5 text-[10px] text-gray-400 leading-5">
                {week[0] && new Date(week[0].date).getDate() <= 7
                  ? format(week[0].date, "M월")
                  : ""}
              </div>

              {week.map((day, di) => (
                <div
                  key={di}
                  className={`
                    w-5 h-5 rounded-sm transition-all cursor-default
                    ${getCellColor(day.count)}
                    ${isToday(day.date) ? "ring-2 ring-purple-500 ring-offset-1" : ""}
                  `}
                  title={`${format(day.date, "MM/dd")} — ${day.count}개`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
        <span>적음</span>
        {["bg-gray-100", "bg-purple-200", "bg-purple-400", "bg-purple-600"].map((c) => (
          <div key={c} className={`w-3.5 h-3.5 rounded-sm ${c}`} />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}
