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
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";

/**
 * 하단 네비게이션 바
 * 인증 상태에 따라 보호된 페이지 접근 시 로그인으로 리다이렉트
 */
export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-purple-100">
      <div className="max-w-screen-lg mx-auto px-4">
        <div className="flex justify-around items-center h-16">
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
        </div>
      </div>
    </nav>
  );
}
