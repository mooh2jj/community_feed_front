"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faPlus,
  faTrophy,
  faUser,
  faSignInAlt,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import NotificationDropdown from "@/components/notification/NotificationDropdown";

/**
 * 하단 네비게이션 바
 * 인증 상태에 따라 보호된 페이지 접근 시 로그인으로 리다이렉트
 * 알림 벨 아이콘: 로그인 후 표시, 클릭 시 드롭다운 토글
 */
export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { unreadCount, isOpen, toggleDropdown } = useNotification();

  // 로그인/회원가입 페이지에서는 네비게이션 숨김
  if (pathname === "/login" || pathname === "/signup") return null;

  const navItems = [
    { href: "/", icon: faHome, label: "홈", authRequired: false },
    { href: "/?compose=true", icon: faPlus, label: "작성", authRequired: true },
    { href: "/ranking", icon: faTrophy, label: "랭킹", authRequired: false },
    {
      href: isAuthenticated ? "/profile" : "/login",
      icon: isAuthenticated ? faUser : faSignInAlt,
      label: isAuthenticated ? "Me" : "로그인",
      authRequired: false,
    },
  ];

  /** 인증 필요 페이지 클릭 시 로그인 가드 */
  const handleNavClick = (
    e: React.MouseEvent,
    item: (typeof navItems)[number],
  ) => {
    if (item.authRequired && !isAuthenticated) {
      e.preventDefault();
      router.push("/login");
    }
  };

  /** 알림 벨 클릭: 비로그인 시 로그인 페이지 이동, 로그인 시 드롭다운 토글 */
  const handleBellClick = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    toggleDropdown();
  };

  // 배지 표시 텍스트 (99 초과 시 "99+")
  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    // pb-safe: iOS 홈 인디케이터 영역까지 nav 배경색이 채워지도록
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-purple-100 pb-safe">
      {/* 알림 드롭다운: nav 위에 렌더링 */}
      <NotificationDropdown />

      <div className="max-w-screen-lg mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {/* 일반 네비게이션 아이콘 */}
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "text-purple-600 scale-110"
                    : "text-gray-500 hover:text-purple-500 hover:scale-105"
                }`}
              >
                <FontAwesomeIcon
                  icon={item.icon}
                  className={`text-xl ${isActive ? "text-purple-600" : ""}`}
                />
                <span className="text-xs font-semibold">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-1 h-1 rounded-full bg-purple-600 animate-pulse" />
                )}
              </Link>
            );
          })}

          {/* 알림 벨 아이콘 (relative로 배지 위치 기준점) */}
          <button
            onClick={handleBellClick}
            aria-label="알림"
            className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
              isOpen
                ? "text-purple-600 scale-110"
                : "text-gray-500 hover:text-purple-500 hover:scale-105"
            }`}
          >
            <FontAwesomeIcon
              icon={faBell}
              className={`text-xl ${isOpen ? "text-purple-600" : ""}`}
            />
            <span className="text-xs font-semibold">알림</span>

            {/* 미읽음 숫자 배지 */}
            {isAuthenticated && unreadCount > 0 && (
              <span
                className="
                  absolute -top-0.5 right-2
                  min-w-4 h-4 px-1
                  bg-rose-500 text-white text-[9px] font-bold
                  rounded-full flex items-center justify-center
                  leading-none pointer-events-none
                "
              >
                {badgeText}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
