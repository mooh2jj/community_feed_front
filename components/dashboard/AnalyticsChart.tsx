"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DailyMetric } from "@/lib/types";

type Period = "7d" | "30d" | "all";

interface TabConfig {
  key: string;
  label: string;
  emoji: string;
  data: DailyMetric[];
  color: string;
}

interface Props {
  views: DailyMetric[];
  likes: DailyMetric[];
  posts: DailyMetric[];
  followers: DailyMetric[];
}

function filterByPeriod(data: DailyMetric[], period: Period): DailyMetric[] {
  if (period === "all") return data;
  const days = period === "7d" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return data.filter((d) => new Date(d.date) >= cutoff);
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
 * 기간별 콘텐츠 성과 분석 차트 (recharts AreaChart)
 */
export default function AnalyticsChart({ views, likes, posts, followers }: Props) {
  const [period, setPeriod] = useState<Period>("30d");
  const [activeTab, setActiveTab] = useState("views");

  const allTabs: TabConfig[] = [
    { key: "views",     label: "조회수", emoji: "👁",  data: filterByPeriod(views,     period), color: "#7c3aed" },
    { key: "likes",     label: "좋아요", emoji: "❤️",  data: filterByPeriod(likes,     period), color: "#ec4899" },
    { key: "posts",     label: "게시글", emoji: "📝",  data: filterByPeriod(posts,     period), color: "#06b6d4" },
    { key: "followers", label: "팔로워", emoji: "👥",  data: filterByPeriod(followers, period), color: "#10b981" },
  ];

  const current = allTabs.find((t) => t.key === activeTab)!;
  const isEmpty = current.data.every((d) => d.count === 0);

  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-gray-900 text-base">📈 콘텐츠 성과 분석</h3>
          <p className="text-xs text-gray-400 mt-0.5">기간별 주요 지표 추이</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["7d", "30d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                period === p ? "bg-white text-purple-700 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "7d" ? "7일" : p === "30d" ? "30일" : "전체"}
            </button>
          ))}
        </div>
      </div>

      {/* 지표 선택 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {allTabs.map((tab) => {
          const tabTotal = tab.data.reduce((s, d) => s + d.count, 0);
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
                {fmt(tabTotal)}
              </p>
            </button>
          );
        })}
      </div>

      {/* 차트 */}
      {isEmpty ? (
        <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
          <p className="text-3xl">📊</p>
          <p className="text-sm">선택 기간에 데이터가 없습니다</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={current.data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${current.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={current.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={current.color} stopOpacity={0.02} />
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
              content={(props: any) => <CustomTooltip {...props} color={current.color} />}
              cursor={{ stroke: current.color, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={current.color}
              strokeWidth={2.5}
              fill={`url(#grad-${current.key})`}
              dot={false}
              activeDot={{ r: 5, fill: current.color, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
