// app/login/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoginForm from '@/components/Auth/LoginForm';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const { role, id } = session.user;
      console.log("role : ", role , "-- End --")

      if (role === 'ADMIN') {
        router.replace('/admin');
        return;
      }
      if (role === 'USER' && id) {
        router.replace(`/user/${id}`);
        return;
      }
      // fallback
      router.replace('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  // 只有未登入才顯示表單
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-6">
        <h2 className="text-center text-3xl font-bold">登入</h2>
        <LoginForm />
      </div>
    </div>
  );
}