
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
  
  // 獲取可能的 callbackUrl
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 使用 redirect: false 來獲取結果
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false, // 改為 false 來獲取結果
        callbackUrl: callbackUrl,
      });

      // 檢查登入結果
      if (result?.error) {
        setError('登入失敗，請檢查帳號密碼');
        setIsLoading(false);
      } else if (result?.url) {
        // 登入成功，手動重定向
        window.location.href = result.url;
      } else {
        // 未知情況
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
      console.log('Starting Google login with callbackUrl:', callbackUrl);
      
      // 對於 Google 登入，使用 redirect: true 讓瀏覽器直接跳轉
      const result = await signIn('google', {
        redirect: false, // 先獲取結果
        callbackUrl: callbackUrl,
      });
      
      if (result?.error) {
        setError('Google 登入失敗，請稍後再試');
        setIsGoogleLoading(false);
      } else if (result?.url) {
        // 重定向到 Google 登入頁面
        window.location.href = result.url;
      }
      
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google 登入發生錯誤，請稍後再試');
      setIsGoogleLoading(false);
    }
  };

  // 直接跳轉的 Google 登入方法（備用）
  const handleGoogleLoginDirect = () => {
    setIsGoogleLoading(true);
    setError('');
    
    // 直接構建 Google 登入 URL
    const googleSignInUrl = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    window.location.href = googleSignInUrl;
  };

  return (
    <div className="space-y-6">
      {/* 傳統帳密登入表單 */}
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

      {/* 分隔線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">或</span>
        </div>
      </div>

      {/* Google 登入按鈕 */}
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
        
        {/* 備用直接跳轉按鈕（如果上面不工作） */}
        <Button
          variant="ghost"
          className="w-full text-sm"
          onClick={handleGoogleLoginDirect}
          disabled={isLoading || isGoogleLoading}
          type="button"
        >
          直接 Google 登入
        </Button>
      </div>
    </div>
  );
}