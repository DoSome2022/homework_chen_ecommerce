// src/app/(admin)/admin/components/Navbar.tsx
"use client";

import { logoutAction } from "@/lib/auth/LogOut";
import { useRouter } from "next/navigation";
import Link from "next/link"; // ← 加上這行！
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutAction();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("登出失敗:", error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 品牌 */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
              德昌五金
            </Link>
          </div>

          {/* 導覽 + 登出 */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              首頁
            </Link>
            <Link
              href="/admin/product"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >

              商品
            </Link>
            <Link
              href="/admin/users"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              用戶
              
            </Link>
            <Link
              href="/admin/unit"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              單位
            </Link>
            <Link
              href="/admin/materials"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              材料
            </Link>
            <Link
              href="/admin/categories"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              類型
            </Link>
            <Link
              href="/admin/order"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              訂單
            </Link>
            <Link
              href="/admin/accountant"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              帳目
            </Link>
            <Link
              href="/admin/renewals"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              續訂
            </Link>

            {/* 登出按鈕 */}
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="ml-4"
            >
              登出
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}