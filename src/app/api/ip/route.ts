// app/api/ip/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') || 
              '無法取得';
  return Response.json({ ip });
}