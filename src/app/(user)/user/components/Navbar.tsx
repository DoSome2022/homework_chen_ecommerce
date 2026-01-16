// src/app/components/Navbar.tsx 或正確路徑
"use client";

import { logoutAction } from "@/lib/auth/LogOut";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react"; // ← 關鍵！用 next-auth 的 hook
import { useEffect, useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession(); // ← 標準寫法
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");

  // 當 session 載入完成後設定 userId
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id as string);
    }
  }, [session]);

  const handleLogout = async () => {
    try {
      await logoutAction();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  // 載入中或無 session 時的處理
  if (status === "loading") {
    return <nav className="bg-white shadow-sm border-b h-16" />; // 骨架
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

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
              德昌五金
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href={`/user/${userId}/shop`}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              商店
            </Link>
            <Link
              href={`/user/${userId}`}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              使用者頁面
            </Link>
            <Link
              href={`/user/${userId}/order`}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              訂單
            </Link>

            <Link
              href={`/user/${userId}/cart`}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              購物車
            </Link>

            <Link
              href={`/user/${userId}/wishlist`}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              願望清單
            </Link>


            <Button onClick={handleLogout} variant="destructive" className="ml-4">
              登出
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}