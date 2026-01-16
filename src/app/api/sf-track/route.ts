// src/app/api/sf-track/route.ts
import { NextRequest } from "next/server";
import { trackSFOrder } from "@/lib/sf-tracking";

export async function POST(req: NextRequest) {
  try {
    const { trackingNumber } = await req.json();

    if (!trackingNumber || typeof trackingNumber !== "string") {
      return Response.json({ success: false, error: "請提供有效運單號" }, { status: 400 });
    }

    const result = await trackSFOrder(trackingNumber.trim());

    return Response.json(result);
  } catch (error) {
    console.error("順豐追蹤 API 內部錯誤:", error);
    return Response.json({ success: false, error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic"; // 確保每次請求都動態執行