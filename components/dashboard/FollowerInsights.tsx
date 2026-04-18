"use client";

import Image from "next/image";
import { UserSummaryResponse } from "@/lib/types";
import { fileAPI } from "@/lib/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";

interface Props {
  followers: UserSummaryResponse[];
  totalFollowerCount: number;
}

/**
 * 팔로워 인사이트
 * - 최근 팔로워 목록 (최대 5명 미리보기)
 * - 아직 맞팔하지 않은 팔로워에 맞팔 표시
 */
export default function FollowerInsights({ followers, totalFollowerCount }: Props) {
  return (
    <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">👥 팔로워 인사이트</h3>
        <span className="text-sm bg-purple-50 text-purple-700 font-semibold px-3 py-1 rounded-full">
          총 {totalFollowerCount}명
        </span>
      </div>

      {followers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">👤</p>
          <p className="text-sm font-medium">아직 팔로워가 없습니다.</p>
          <p className="text-xs mt-1.5 text-gray-400">
            꾸준히 게시글을 올리면 팔로워가 늘어납니다!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {followers.slice(0, 5).map((f) => {
            const imgUrl = f.profileImageUrl
              ? fileAPI.getImageUrl(f.profileImageUrl, "USER")
              : null;

            return (
              <div key={f.email} className="flex items-center gap-3">
                {/* 프로필 이미지 */}
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0">
                  {imgUrl ? (
                    <Image src={imgUrl} alt={f.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white font-bold text-sm">
                      {f.name[0]}
                    </div>
                  )}
                </div>

                {/* 이름 · 이메일 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{f.name}</p>
                  <p className="text-xs text-gray-400 truncate">{f.email}</p>
                </div>

                {/* 맞팔 안 된 팔로워 표시 */}
                {!f.isFollowing && (
                  <span className="shrink-0 text-xs bg-purple-100 text-purple-700 rounded-full px-2.5 py-1 flex items-center gap-1 font-medium">
                    <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
                    맞팔
                  </span>
                )}
              </div>
            );
          })}

          {followers.length > 5 && (
            <p className="text-xs text-center text-gray-400 pt-1 border-t border-gray-100">
              + 외 {followers.length - 5}명
            </p>
          )}
        </div>
      )}
    </div>
  );
}
