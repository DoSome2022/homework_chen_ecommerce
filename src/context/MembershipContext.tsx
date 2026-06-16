// src/context/MembershipContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MembershipLevel } from '@prisma/client';
import Link from 'next/link';
import { X } from 'lucide-react';  // ← 新增：關閉圖示

type MembershipContextType = {
  level: MembershipLevel;
  tierId: string | null;
  isExpired: boolean;
  endsAt: Date | null;
};

const MembershipContext = createContext<MembershipContextType>({
  level: 'FREE',
  tierId: null,
  isExpired: false,
  endsAt: null,
});

export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within MembershipProvider');
  }
  return context;
}

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [membershipInfo, setMembershipInfo] = useState<MembershipContextType>({
    level: 'FREE',
    tierId: null,
    isExpired: false,
    endsAt: null,
  });

  // ★ 新增：橫幅關閉狀態
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const level = (session.user.currentMembershipLevel as MembershipLevel) ?? 'FREE';
      const tierId = session.user.currentMembershipTierId ?? null;
      const isExpired = session.user.isMembershipExpired ?? false;
      const endsAt = session.user.membershipEndsAt ? new Date(session.user.membershipEndsAt) : null;

      setMembershipInfo({ level, tierId, isExpired, endsAt });

      // ★ 當會員過期狀態改變時，重置橫幅顯示
      setBannerDismissed(false);
    }
  }, [session]);

// 儲存關閉狀態

  // ★ 處理關閉
  const handleDismissBanner = () => {
    setBannerDismissed(true);
  };

  return (
    <MembershipContext.Provider value={membershipInfo}>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50">
          {/* Navbar */}
        </header>

        <main className="flex-1">
          {children}
        </main>

        {/* ★ 過期提醒橫幅 - 加上 bannerDismissed 判斷 */}
        {membershipInfo.isExpired && !bannerDismissed && session?.user?.id && (
          <div className="fixed inset-x-0 bottom-0 z-50 bg-amber-600/90 text-white p-4 shadow-2xl">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pr-10">
              {' '}
              {/* ← 右側留空間給 x 按鈕 */}
              <p className="font-medium text-center sm:text-left">
                您的會員資格已於{' '}
                {membershipInfo.endsAt?.toLocaleDateString('zh-TW') ?? '未知日期'} 過期，
                部分功能暫時無法使用
              </p>

              <Link href={`/user/${session.user.id}/membership`}>
                <button className="bg-white text-amber-900 hover:bg-amber-50 px-6 py-2 rounded-md font-medium whitespace-nowrap">
                  立即續訂
                </button>
              </Link>
            </div>

            {/* ★ 關閉按鈕 */}
            <button
              onClick={handleDismissBanner}
              className="absolute top-1/2 right-4 -translate-y-1/2 p-1 rounded-full hover:bg-amber-500/50 transition-colors"
              aria-label="關閉提醒"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </MembershipContext.Provider>
  );
}
