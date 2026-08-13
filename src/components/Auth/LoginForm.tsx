// components/Auth/LoginForm.tsx
'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Chrome, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // ✅ 發送登入通知郵件
  const sendLoginNotification = async (email: string, name: string, provider: string) => {
    try {
      // 獲取用戶 IP
      const ipResponse = await fetch('/api/ip');
      const ipData = await ipResponse.json();
      
      const response = await fetch('/api/auth/send-login-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          provider,
          ip: ipData.ip || '無法取得',
          userAgent: navigator.userAgent,
        }),
      });
      
      if (!response.ok) {
        console.error('發送登入通知郵件失敗:', await response.text());
      }
    } catch (error) {
      console.error('發送登入通知郵件錯誤:', error);
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userAgent = navigator.userAgent;
      
      const ipResponse = await fetch('/api/ip');
      const ipData = await ipResponse.json();
      
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: callbackUrl,
        userAgent: userAgent,
        ipAddress: ipData.ip || '無法取得',
      });

      if (result?.error) {
        setError('登入失敗，請檢查帳號密碼');
        setIsLoading(false);
      } else if (result?.url) {
        // ✅ 登入成功後，獲取用戶資訊並發送郵件
        try {
          // 獲取當前 session 以獲得用戶 email
          const sessionResponse = await fetch('/api/auth/session');
          const sessionData = await sessionResponse.json();
          
          if (sessionData?.user?.email) {
            await sendLoginNotification(
              sessionData.user.email,
              sessionData.user.name || username,
              'credentials'
            );
          }
        } catch (emailError) {
          console.error('發送郵件失敗:', emailError);
        }
        
        // 重定向
        window.location.href = result.url;
      } else {
        setError('登入發生未知錯誤');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('發生錯誤，請稍後再試');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: callbackUrl,
      });
      
      if (result?.error) {
        setError('Google 登入失敗，請稍後再試');
        setIsGoogleLoading(false);
      } else if (result?.url) {
        // ✅ Google 登入成功後，獲取用戶資訊並發送郵件
        try {
          // 等待一下讓 session 建立
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const sessionResponse = await fetch('/api/auth/session');
          const sessionData = await sessionResponse.json();
          
          if (sessionData?.user?.email) {
            await sendLoginNotification(
              sessionData.user.email,
              sessionData.user.name || 'Google 用戶',
              'google'
            );
          }
        } catch (emailError) {
          console.error('發送郵件失敗:', emailError);
        }
        
        window.location.href = result.url;
      }
      
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google 登入發生錯誤，請稍後再試');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCredentialsLogin} className="space-y-4">
        <Input
          type="text"
          placeholder="使用者名稱"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading || isGoogleLoading}
          required
          autoComplete="username"
        />
        <Input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading || isGoogleLoading}
          required
          autoComplete="current-password"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              登入中...
            </>
          ) : (
            '登入'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">或</span>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          type="button"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Chrome className="h-5 w-5" />
          )}
          使用 Google 登入
        </Button>
      </div>
    </div>
  );
}