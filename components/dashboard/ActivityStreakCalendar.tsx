"use client";

import { format, subDays, isToday } from "date-fns";
import { StreakResponse } from "@/lib/types";

interface Props {
  streak: StreakResponse;
}

// ─── 캘린더 셀 색상 ──────────────────────────────────────────────────────────

function getCellColor(isActive: boolean): string {
  return isActive ? "bg-purple-400" : "bg-gray-100";
}

// ─── ActivityStreakCalendar 컴포넌트 ─────────────────────────────────────────

/**
 * 스터디 스트릭 캘린더
 * - dashboardAPI.getStreak 결과를 props로 수신
 * - activityDates Set으로 O(1) 날짜 조회
 * - GitHub Contribution Graph 스타일 — 최근 84일(12주) 그리드
 */
export default function ActivityStreakCalendar({ streak }: Props) {
  const { activityDates, currentStreak, longestStreak, totalActiveDays } = streak;
  const activitySet = new Set(activityDates);

  // 84일 × 날짜 배열 생성
  const days = Array.from({ length: 84 }, (_, i) => {
    const date = subDays(new Date(), 83 - i);
    return { date, dateStr: format(date, "yyyy-MM-dd") };
  });

  // 12주 단위 분할
  const weeks: typeof days[number][][] = [];
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
          <span className="text-orange-500 font-bold">현재 {currentStreak}일 연속</span>
          <span className="text-gray-400">최장 {longestStreak}일</span>
          <span className="text-gray-400">활동 {totalActiveDays}일</span>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {/* 요일 레이블 열 */}
          <div className="flex flex-col gap-1 mr-1">
            <div className="h-5" />
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

              {week.map((day, di) => {
                const isActive = activitySet.has(day.dateStr);
                return (
                  <div
                    key={di}
                    className={`
                      w-5 h-5 rounded-sm transition-all cursor-default
                      ${getCellColor(isActive)}
                      ${isToday(day.date) ? "ring-2 ring-purple-500 ring-offset-1" : ""}
                    `}
                    title={`${format(day.date, "MM/dd")} — ${isActive ? "활동" : "없음"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
        <span>없음</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-purple-400" />
        <span>활동</span>
        {currentStreak === 0 && (
          <span className="ml-auto text-purple-500 font-medium">
            오늘 첫 글을 작성해보세요! ✍️
          </span>
        )}
      </div>
    </div>
  );
}
