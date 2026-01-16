// src/app/api/sf-track/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const SF_API_URL = "https://sfapi.sf-express.com/std/service";
const SF_API_KEY = process.env.SF_API_KEY!;
const SF_CUSTOMER_CODE = process.env.SF_CUSTOMER_CODE!;

// 定義順豐路由回傳結構（根據官方文件調整）
type SFRouteItem = {
  acceptTime?: string;
  opTime?: string;
  remark?: string;
  opDesc?: string;
  acceptAddress?: string;
  opName?: string;
};

type SFRouteResponse = {
  success?: boolean;
  msg?: string;
  routeResList?: Array<{
    route?: SFRouteItem[];
  }>;
};

type ApiResponse = {
  success: boolean;
  data?: { route: Array<{ opTime: string; opDesc: string; opName?: string }> };
  error?: string;
};

export async function POST(request: Request) {
  const { trackingNumber } = await request.json();

  if (!trackingNumber) {
    return NextResponse.json({ error: "請提供運單號" }, { status: 400 });
  }

  try {
    const serviceCode = "EXP_RECE_SEARCH_ROUTES";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const msgData = JSON.stringify({
      trackingType: 1,
      trackingNumber: [trackingNumber],
      methodType: 1,
    });

    const checkword = Buffer.from(SF_API_KEY, "utf8").toString("base64");
    const signStr = msgData + timestamp + checkword;
    const signature = crypto
      .createHash("md5")
      .update(signStr, "utf8")
      .digest("base64");

    const body = {
      partnerID: SF_CUSTOMER_CODE,
      requestID: crypto.randomUUID(),
      serviceCode,
      timestamp,
      msgData,
      msgDigest: signature,
    };

    const res = await fetch(SF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([body]),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data[0]?.apiResultData) {
      const result: SFRouteResponse = JSON.parse(data[0].apiResultData);

      if (result.success || result.msg === "Success") {
        const routeItems = result.routeResList?.[0]?.route || [];

        const formattedRoute = routeItems.map((item: SFRouteItem) => ({
          opTime: item.acceptTime || item.opTime || "",
          opDesc: item.remark || item.opDesc || "未知操作",
          opName: item.acceptAddress || item.opName,
        }));

        return NextResponse.json<ApiResponse>({
          success: true,
          data: { route: formattedRoute.reverse() }, // 最新狀態在上
        });
      }
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: data[0]?.errorMsg || "查無資料",
    });
  } catch (error) {
    console.error("順豐官方查詢失敗:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "查詢失敗，請稍後再試",
    }, { status: 500 });
  }
}