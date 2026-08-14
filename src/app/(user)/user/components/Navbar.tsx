// src/app/components/Navbar.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const membershipLevelMap: Record<string, { name: string; className: string }> = {
  FREE: { name: '免費會員', className: 'bg-gray-100 text-gray-700' },
  SILVER: { name: '銀級會員', className: 'bg-gray-200 text-gray-700' },
  GOLD: { name: '金級會員', className: 'bg-yellow-100 text-yellow-800' },
  PLATINUM: { name: '白金會員', className: 'bg-purple-100 text-purple-800' },
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id as string);
    }
  }, [session]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false, callbackUrl: "/login" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  if (status === "loading") {
    return <nav className="bg-white shadow-sm border-b h-16" />;
  }

  if (!session) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-semibold">
              德昌五金
            </Link>
            <Button asChild>
              <Link href="/login">登入</Link>
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  const userLevel = session.user?.currentMembershipLevel as
    | 'FREE'
    | 'SILVER'
    | 'GOLD'
    | 'PLATINUM'
    | undefined;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between min-h-16 py-2">

          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
              德昌五金
            </Link>
          </div>

          <div className="flex flex-col items-end justify-center h-full">
            <div className="flex items-center space-x-6">
              <Link href={`/user/${userId}/shop`} className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                商店
              </Link>
              <Link href={`/user/${userId}`} className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                使用者頁面
              </Link>
              <Link href={`/user/${userId}/order`} className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                訂單
              </Link>
              <Link href={`/user/${userId}/cart`} className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                購物車
              </Link>
              <Link href={`/user/${userId}/wishlist`} className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                願望清單
              </Link>

              <div className="flex flex-col items-end ml-4">
                <Button onClick={handleLogout} variant="destructive">
                  登出
                </Button>

                {/* ✅ 會員等級（FREE 不顯示，未登入已被擋掉） */}
                {userLevel  && (
                  <span
                    className={`mt-1 text-xs px-2 py-0.5 rounded-full ${
                      membershipLevelMap[userLevel]?.className ??
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {membershipLevelMap[userLevel]?.name ?? userLevel}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-0.5">九龍深水埗大南街67號地下B舖</p>
            <p className="text-xs text-gray-400 mt-0.5">
              @ 2026 Tak Cheong. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
