// src/lib/sf-tracking.ts
export type SFTrackingResponse = {
  success: boolean;
  data?: {
    route: Array<{
      opTime: string;
      opDesc: string;
      opName?: string;
    }>;
    mailNo: string;
    status: string;
  };
  error?: string;
};

// TrackingMore API 主要回傳結構
type TrackingMoreMeta = {
  code: number;
  message?: string;
};

type TrackingMoreItem = {
  tracking_number: string;
  courier_code: string;
  delivery_status?: string;
  status?: string;
  origin_info?: {
    trackinfo?: Array<{
      Date?: string;
      time?: string;
      StatusDescription?: string;
      description?: string;
      Details?: string;
    }>;
  };
  destination_info?: {
    trackinfo?: Array<{
      Date?: string;
      time?: string;
      StatusDescription?: string;
      description?: string;
      Details?: string;
    }>;
  };
};

type TrackingMoreResponse = {
  meta: TrackingMoreMeta;
  data?: {
    items?: TrackingMoreItem[];
  };
};

export async function trackSFOrder(trackingNumber: string): Promise<SFTrackingResponse> {
  const API_KEY = process.env.TRACKINGMORE_API_KEY!;

  if (!API_KEY) {
    return { success: false, error: "缺少 TrackingMore API 設定" };
  }

  try {
    const getUrl = `https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${encodeURIComponent(trackingNumber)}`;

    let response = await fetch(getUrl, {
      method: "GET",
      headers: {
        "Tracking-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    let result: TrackingMoreResponse = await response.json();

    // 若查詢成功，優先處理
    if (response.ok && result.meta.code === 200) {
      const items = result.data?.items ?? [];  // ← 安全預設空陣列

      if (items.length > 0) {
        const sfItem = items.find((i: TrackingMoreItem) => i.courier_code === "sf-express");

        if (sfItem) {
          const trackinfo = sfItem.origin_info?.trackinfo ?? sfItem.destination_info?.trackinfo ?? [];
          return processTrackingResult(sfItem, trackinfo, trackingNumber);
        }
      }

      // 無記錄或非順豐
      return {
        success: true,
        data: { route: [], mailNo: trackingNumber, status: "pending" },
      };
    }

    // 若查詢失敗，嘗試註冊追蹤
    const createRes = await fetch("https://api.trackingmore.com/v4/trackings/create", {
      method: "POST",
      headers: {
        "Tracking-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracking_number: trackingNumber,
        courier_code: "sf-express",
      }),
    });

    const createData: TrackingMoreResponse = await createRes.json();

    // 已存在（4101）或類似錯誤：重新查詢
    if (createData.meta.code === 4101 || createData.meta.message?.toLowerCase().includes("already exists")) {
      response = await fetch(getUrl, {
        method: "GET",
        headers: {
          "Tracking-Api-Key": API_KEY,
          "Content-Type": "application/json",
        },
      });

      result = await response.json();

      if (response.ok && result.meta.code === 200) {
        const items = result.data?.items ?? [];
        if (items.length > 0) {
          const sfItem = items.find((i: TrackingMoreItem) => i.courier_code === "sf-express");
          if (sfItem) {
            const trackinfo = sfItem.origin_info?.trackinfo ?? sfItem.destination_info?.trackinfo ?? [];
            return processTrackingResult(sfItem, trackinfo, trackingNumber);
          }
        }
      }

      return {
        success: true,
        data: { route: [], mailNo: trackingNumber, status: "pending" },
      };
    }

    // 其他註冊錯誤
    if (createData.meta.code !== 200) {
      return { success: false, error: createData.meta.message ?? "註冊追蹤失敗" };
    }

    // 註冊成功：延遲後查詢
    await new Promise(resolve => setTimeout(resolve, 2000));

    response = await fetch(getUrl, {
      method: "GET",
      headers: {
        "Tracking-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    result = await response.json();

    if (response.ok && result.meta.code === 200) {
      const items = result.data?.items ?? [];
      if (items.length > 0) {
        const sfItem = items.find((i: TrackingMoreItem) => i.courier_code === "sf-express");
        if (sfItem) {
          const trackinfo = sfItem.origin_info?.trackinfo ?? sfItem.destination_info?.trackinfo ?? [];
          return processTrackingResult(sfItem, trackinfo, trackingNumber);
        }
      }
    }

    return {
      success: true,
      data: { route: [], mailNo: trackingNumber, status: "pending" },
    };
  } catch (error: unknown) {
    console.error("TrackingMore 請求失敗:", error);
    const message = error instanceof Error ? error.message : "網路異常";
    return { success: false, error: message + "，請稍後再試" };
  }
}

function processTrackingResult(
  item: TrackingMoreItem,
  trackinfo: Array<{
    Date?: string;
    time?: string;
    StatusDescription?: string;
    description?: string;
    Details?: string;
  }>,
  trackingNumber: string
) {
  return {
    success: true,
    data: {
      route: trackinfo
        .map(log => ({
          opTime: log.Date || log.time || new Date().toISOString(),
          opDesc: log.StatusDescription || log.description || "處理中",
          opName: log.Details,
        }))
        .reverse(),
      mailNo: item.tracking_number || trackingNumber,
      status: item.delivery_status || item.status || "in_transit",
    },
  };
}