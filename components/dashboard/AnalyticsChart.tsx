"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { dashboardAPI } from "@/lib/api";
import { DailyMetric, DailyMetricsResponse } from "@/lib/types";

type Period = "7d" | "30d" | "90d";

interface TabConfig {
  key: keyof Pick<DailyMetricsResponse, "views" | "likes" | "posts" | "followers">;
  label: string;
  emoji: string;
  color: string;
}

const ALL_TABS: TabConfig[] = [
  { key: "views",     label: "조회수", emoji: "👁",  color: "#7c3aed" },
  { key: "likes",     label: "좋아요", emoji: "❤️",  color: "#ec4899" },
  { key: "posts",     label: "게시글", emoji: "📝",  color: "#06b6d4" },
  { key: "followers", label: "팔로워", emoji: "👥",  color: "#10b981" },
];

/**
 * 비어있는 날짜는 API가 생략하므로 프론트에서 0으로 채웁니다.
 */
function fillMissingDates(data: DailyMetric[], period: Period): DailyMetric[] {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const countMap = new Map(data.map((d) => [d.date, d.count]));
  const result: DailyMetric[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    result.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 });
  }
  return result;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function CustomTooltip({
  active,
  payload,
  label,
  color,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-2.5 text-sm">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="font-bold" style={{ color }}>
        {fmt(payload[0].value ?? 0)}
      </p>
    </div>
  );
}

/**
 * 기간별 콘텐츠 성과 분석 차트
 * - 기간 탭(7일/30일/90일) 변경 시 dashboardAPI.getDailyMetrics 재호출
 * - 4가지 지표(조회수/좋아요/게시글/팔로워) 탭 전환
 */
export default function AnalyticsChart() {
  const [period, setPeriod] = useState<Period>("30d");
  const [activeTab, setActiveTab] = useState<TabConfig["key"]>("views");
  const [metrics, setMetrics] = useState<DailyMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await dashboardAPI.getDailyMetrics(period);
        if (!cancelled && res.success) setMetrics(res.data);
      } catch {
        // 차트 로딩 실패는 전체 페이지에 영향 없이 조용히 처리
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [period]);

  const currentTab = ALL_TABS.find((t) => t.key === activeTab)!;
  const chartData = fillMissingDates(metrics?.[activeTab] ?? [], period);
  const isEmpty = chartData.every((d) => d.count === 0);

  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-gray-900 text-base">📈 콘텐츠 성과 분석</h3>
          <p className="text-xs text-gray-400 mt-0.5">기간별 주요 지표 추이</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                period === p ? "bg-white text-purple-700 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "7d" ? "7일" : p === "30d" ? "30일" : "90일"}
            </button>
          ))}
        </div>
      </div>

      {/* 지표 선택 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {ALL_TABS.map((tab) => {
          const tabData = fillMissingDates(metrics?.[tab.key] ?? [], period);
          const tabTotal = tabData.reduce((s, d) => s + d.count, 0);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-2xl px-3 py-3 text-left transition-all border-2 ${
                isActive
                  ? "border-transparent shadow-md"
                  : "border-gray-100 bg-gray-50 hover:bg-gray-100"
              }`}
              style={isActive ? { backgroundColor: tab.color } : {}}
            >
              <p className={`text-xs mb-1 ${isActive ? "text-white/80" : "text-gray-400"}`}>
                {tab.emoji} {tab.label}
              </p>
              <p className={`text-lg font-bold leading-none ${isActive ? "text-white" : "text-gray-900"}`}>
                {loading ? "—" : fmt(tabTotal)}
              </p>
            </button>
          );
        })}
      </div>

      {/* 차트 영역 */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : isEmpty ? (
        <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
          <p className="text-3xl">📊</p>
          <p className="text-sm">선택 기간에 데이터가 없습니다</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${currentTab.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={currentTab.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={currentTab.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              content={(props: any) => <CustomTooltip {...props} color={currentTab.color} />}
              cursor={{ stroke: currentTab.color, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={currentTab.color}
              strokeWidth={2.5}
              fill={`url(#grad-${currentTab.key})`}
              dot={false}
              activeDot={{ r: 5, fill: currentTab.color, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
