"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faPlus,
  faTrophy,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

/**
 * 하단 네비게이션 바
 * MZ세대를 위한 모바일 친화적 네비게이션
 */
export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: faHome, label: "홈" },
    { href: "/create", icon: faPlus, label: "작성" },
    { href: "/ranking", icon: faTrophy, label: "랭킹" },
    { href: "/profile", icon: faUser, label: "Me" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-purple-100">
      <div className="max-w-screen-lg mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
