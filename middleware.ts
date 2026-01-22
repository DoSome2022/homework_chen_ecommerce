// // middleware.ts
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { auth } from './auth'; // 你的 auth.ts 匯出的 auth

// export async function middleware(request: NextRequest) {
//   const session = await auth();
//   const pathname = request.nextUrl.pathname;

//   // 公開路由放行
//   if (
//     pathname.startsWith('/api/auth') ||
//     pathname.startsWith('/_next') ||
//     pathname === '/favicon.ico' ||
//     pathname === '/login'
//   ) {
//     return NextResponse.next();
//   }

//   // 未登入 → 導向登入頁並帶 callbackUrl
//   if (!session?.user) {
//     const loginUrl = new URL('/login', request.url);
//     loginUrl.searchParams.set('callbackUrl', pathname);
//     return NextResponse.redirect(loginUrl);
//   }

//   const { role, id } = session.user;

//   // 已登入但訪問 /login → 直接導向目標頁
//   if (pathname === '/login') {
//     if (role === 'ADMIN') {
//       return NextResponse.redirect(new URL('/admin', request.url));
//     }
//     if (role === 'USER') {
//       return NextResponse.redirect(new URL(`/user/${id}`, request.url));
//     }
//     // 其他角色（防呆）
//     return NextResponse.redirect(new URL('/', request.url));
//   }

//   // 保護 /admin 路由
//   if (pathname.startsWith('/admin') && role !== 'ADMIN') {
//     return NextResponse.redirect(new URL(`/user/${id}`, request.url));
//   }

//   // 保護 /user/[id] 路由 — 只允許本人
//   if (pathname.startsWith('/user/')) {
//     const targetUserId = pathname.split('/user/')[1]?.split('/')[0];
//     if (role === 'USER' && targetUserId !== id) {
//       return NextResponse.redirect(new URL(`/user/${id}`, request.url));
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     /*
//       除了靜態資源與 auth 相關 API 外，其他路徑都經過 middleware
//     */
//     '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
//   ],
// };

// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // 调试信息
  console.log(`Middleware: pathname=${pathname}, hasSession=${!!session?.user}`);

  // 完全公開、不需檢查的路徑（直接放行）
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.includes('.') || // 靜態文件
    pathname === '/favicon.ico' ||
    pathname.startsWith('/public') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // 未登入 → 導向 /login
  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    
    // 只設置非 user 頁面為 callbackUrl
    if (!pathname.startsWith('/user/')) {
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
    }
    
    console.log(`Redirecting to login from ${pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  // 已登入的情况
  const { role, id } = session.user as { role: string; id: string };
  
  // 已登入訪問 /login → 根據角色導向對應首頁
  if (pathname === '/login') {
    let redirectTo = '/';
    
    if (role === 'ADMIN') {
      redirectTo = '/admin';
    } else if (role === 'USER' || role === 'CUSTOMER') {
      redirectTo = `/user/${id}`;
    } else if (role === 'EMPLOYEE') {
      redirectTo = '/dashboard';
    }
    
    console.log(`Already logged in, redirecting from /login to ${redirectTo}`);
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // 保護 /admin 路由
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    console.log(`Non-admin accessing admin, redirecting to /user/${id}`);
    return NextResponse.redirect(new URL(`/user/${id}`, request.url));
  }

  // 保護 /user/[id] — 只允許本人訪問自己的頁面
  if (pathname.startsWith('/user/')) {
    const segments = pathname.split('/user/')[1]?.split('/') || [];
    const targetUserId = segments[0];
    
    if (targetUserId && targetUserId !== id) {
      console.log(`User ${id} trying to access ${targetUserId}, redirecting to own page`);
      return NextResponse.redirect(new URL(`/user/${id}`, request.url));
    }
  }

  // 放行
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 更精确的匹配，避免无限循环
    '/((?!_next/static|_next/image|favicon\\.ico|api/auth/.*|public/.*).*)',
  ],
};