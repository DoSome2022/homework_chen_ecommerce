// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth'; // 你的 auth.ts 匯出的 auth

export async function middleware(request: NextRequest) {
  const session = await auth();
  const pathname = request.nextUrl.pathname;

  // 公開路由放行
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // 未登入 → 導向登入頁並帶 callbackUrl
  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { role, id } = session.user;

  // 已登入但訪問 /login → 直接導向目標頁
  if (pathname === '/login') {
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (role === 'USER') {
      return NextResponse.redirect(new URL(`/user/${id}`, request.url));
    }
    // 其他角色（防呆）
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 保護 /admin 路由
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL(`/user/${id}`, request.url));
  }

  // 保護 /user/[id] 路由 — 只允許本人
  if (pathname.startsWith('/user/')) {
    const targetUserId = pathname.split('/user/')[1]?.split('/')[0];
    if (role === 'USER' && targetUserId !== id) {
      return NextResponse.redirect(new URL(`/user/${id}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      除了靜態資源與 auth 相關 API 外，其他路徑都經過 middleware
    */
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};