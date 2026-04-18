"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { HashtagStatDto } from "@/lib/types";

interface Props {
  hashtags: HashtagStatDto[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-2.5 text-xs">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-500">
            {p.name === "avgViews" ? "평균 조회" : "평균 좋아요"}:
          </span>
          <span className="font-semibold" style={{ color: p.color }}>
            {p.value?.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * 해시태그 성과 차트 (recharts 가로 막대 그래프)
 * - dashboardAPI.getHashtagAnalytics 결과를 props로 수신
 * - 서버가 정렬(avgViews × 1 + avgLikes × 3 가중치)하여 반환
 */
export default function HashtagAnalytics({ hashtags }: Props) {
  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 text-base">🏷 내 태그 성과</h3>
        <p className="text-xs text-gray-400 mt-0.5">태그별 평균 조회수 · 좋아요 비교</p>
      </div>

      {hashtags.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">🏷️</p>
          <p className="text-sm">해시태그가 있는 게시글이 없습니다.</p>
          <p className="text-xs mt-1.5">
            게시글에{" "}
            <span className="text-purple-600 font-medium">#태그</span>를 추가해보세요!
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={hashtags.length * 44 + 40}>
          <BarChart
            layout="vertical"
            data={hashtags}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="hashtag"
              tick={{ fontSize: 11, fill: "#7c3aed", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              content={(props: any) => <CustomTooltip {...props} />}
              cursor={{ fill: "#f5f3ff" }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-gray-500">
                  {value === "avgViews" ? "평균 조회수" : "평균 좋아요"}
                </span>
              )}
            />
            <Bar dataKey="avgViews" name="avgViews" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            <Bar dataKey="avgLikes" name="avgLikes" fill="#ec4899" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
