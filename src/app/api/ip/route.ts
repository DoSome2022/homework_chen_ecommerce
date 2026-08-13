// // app/api/ip/route.ts
// import { NextRequest } from 'next/server';

// export async function GET(request: NextRequest) {
//   const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
//               request.headers.get('x-real-ip') || 
//               '無法取得';
//   return Response.json({ ip });
// }

// app/api/ip/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 從 headers 獲取真實 IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    let ip = '無法取得';
    
    if (forwardedFor) {
      ip = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      ip = realIp;
    } else {
      // 如果沒有代理，嘗試獲取連接 IP
      ip = request.headers.get('host') || '無法取得';
    }
    
    return NextResponse.json({ ip });
  } catch {
    // ✅ 移除未使用的 error 參數
    return NextResponse.json(
      { ip: '無法取得' },
      { status: 500 }
    );
  }
}