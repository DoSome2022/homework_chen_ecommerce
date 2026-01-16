// src/context/MembershipContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MembershipLevel } from '@prisma/client';
import Link from 'next/link';

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

  useEffect(() => {
    if (session?.user) {
      const level = (session.user.currentMembershipLevel as MembershipLevel) ?? 'FREE';
      const tierId = session.user.currentMembershipTierId ?? null;
      const isExpired = session.user.isMembershipExpired ?? false;
      const endsAt = session.user.membershipEndsAt ? new Date(session.user.membershipEndsAt) : null;

      setMembershipInfo({ level, tierId, isExpired, endsAt });
    }
  }, [session]);

  return (
    <MembershipContext.Provider value={membershipInfo}>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50">
          {/* Navbar */}
        </header>

        {/* ★ 這裡不再套灰階與 pointer-events-none ★ */}
        <main className="flex-1">
          {children}
        </main>

        {/* 過期提醒橫幅 - 保持 pointer-events-auto */}
        {membershipInfo.isExpired && session?.user?.id && (
          <div className="fixed inset-x-0 bottom-0 z-50 bg-amber-600/90 text-white p-4 text-center shadow-2xl">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <p className="font-medium">
                您的會員資格已於 {membershipInfo.endsAt?.toLocaleDateString('zh-TW') ?? '未知日期'} 過期，
                部分功能暫時無法使用
              </p>
              
              <Link href={`/user/${session.user.id}/membership`}>
                <button 
                  className="bg-white text-amber-900 hover:bg-amber-50 px-6 py-2 rounded-md font-medium pointer-events-auto"
                >
                  立即續訂
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </MembershipContext.Provider>
  );
}