// // src/app/(user)/user/[userId]/order/[orderId]/OrderDetail.tsx
// "use client";

// import useSWR from "swr";
// import Image from "next/image";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Loader2, Package, Truck, AlertCircle } from "lucide-react";
// import { format } from "date-fns";
// import { useState } from "react";

// // 順豐物流查詢函數（放在 lib/sf-tracking.ts）
// const trackSFOrder = async (trackingNumber: string) => {
//   const res = await fetch("/api/sf-track", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ trackingNumber }),
//   });
//   return res.json();
// };

// const fetcher = (url: string) => fetch(url).then((res) => res.json());

// type Order = {
//   orderNumber: string;
//   total: number;
//   status: string;
//   createdAt: string;
//   shippingName: string;
//   shippingPhone: string;
//   shippingAddress: string;
//   trackingNumber?: string;
//   items: Array<{
//     title: string;
//     image: string | null;
//     size: string;
//     quantity: number;
//     price: number;
//   }>;
// };

// export default function OrderDetail({
//   userId,
//   orderId,
// }: {
//   userId: string;
//   orderId: string;
// }) {
//   const { data: order, isLoading } = useSWR<Order>(
//     `/api/user/${userId}/orders/${orderId}`,
//     fetcher
//   );

//   const [trackingData, setTrackingData] = useState<any>(null);
//   const [trackingLoading, setTrackingLoading] = useState(false);
//   const [trackingError, setTrackingError] = useState<string | null>(null);

//   const handleTrack = async () => {
//     if (!order?.trackingNumber) return;

//     setTrackingLoading(true);
//     setTrackingError(null);

//     try {
//       const result = await trackSFOrder(order.trackingNumber);
//       if (result.success) {
//         setTrackingData(result.data);
//       } else {
//         setTrackingError(result.error || "查詢失敗");
//       }
//     } catch (err) {
//       setTrackingError("網路錯誤，請重試");
//     } finally {
//       setTrackingLoading(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex justify-center items-center h-96">
//         <Loader2 className="h-12 w-12 animate-spin" />
//       </div>
//     );
//   }

//   if (!order) {
//     return <div className="text-center py-24 text-xl">訂單不存在</div>;
//   }

//   return (
//     <div className="max-w-4xl mx-auto py-12 space-y-8">
//       <h1 className="text-4xl font-bold mb-8">訂單詳情</h1>

//       {/* 訂單基本資訊 */}
//       <Card className="mb-8">
//         <CardHeader>
//           <div className="flex justify-between items-start flex-wrap gap-4">
//             <div>
//               <CardTitle className="text-2xl">訂單 {order.orderNumber}</CardTitle>
//               <p className="text-gray-600 mt-2">
//                 下單時間：{format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
//               </p>
//             </div>
//             <Badge variant={order.status === "pending" ? "secondary" : "default"} className="text-lg px-4 py-2">
//               {order.status === "pending" ? "待付款" : "已完成"}
//             </Badge>
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-8">
//           {/* 收件資訊 */}
//           <div>
//             <h3 className="font-semibold text-lg mb-3">收件資訊</h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
//               <p><span className="font-medium">收件人：</span> {order.shippingName}</p>
//               <p><span className="font-medium">電話：</span> {order.shippingPhone}</p>
//               <p className="md:col-span-2"><span className="font-medium">地址：</span> {order.shippingAddress}</p>
//             </div>
//           </div>

//           {/* 商品明細 */}
//           <div className="border-t pt-6">
//             <h3 className="font-semibold text-lg mb-4">商品明細</h3>
//             {order.items.map((item, i) => (
//               <div key={i} className="flex gap-4 py-4 border-b last:border-0">
//                 {item.image && (
//                   <Image
//                     src={item.image}
//                     alt={item.title}
//                     width={80}
//                     height={80}
//                     className="rounded-lg object-cover border"
//                   />
//                 )}
//                 <div className="flex-1">
//                   <p className="font-medium text-lg">{item.title}</p>
//                   <p className="text-sm text-gray-600 mt-1">
//                     規格：{item.size} × {item.quantity} 件
//                   </p>
//                   <p className="text-xl font-bold text-primary mt-3">
//                     NT${(item.price * item.quantity).toLocaleString()}
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* 總計 */}
//           <div className="text-right text-3xl font-bold text-primary pt-6 border-t">
//             總計：NT${order.total.toLocaleString()}
//           </div>
//         </CardContent>
//       </Card>

//       {/* 順豐物流追蹤 */}
//       {order.trackingNumber && (
//         <Card>
//           <CardHeader>
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <Truck className="w-7 h-7 text-emerald-600" />
//                 <CardTitle className="text-2xl">物流追蹤</CardTitle>
//               </div>
//               <Button
//                 onClick={handleTrack}
//                 disabled={trackingLoading}
//                 className="bg-emerald-600 hover:bg-emerald-700"
//               >
//                 {trackingLoading ? (
//                   <>
//                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                     查詢中...
//                   </>
//                 ) : (
//                   <>
//                     <Package className="w-4 h-4 mr-2" />
//                     查看最新狀態
//                   </>
//                 )}
//               </Button>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-center gap-2 text-lg font-medium mb-6">
//               <span className="text-gray-600">運單號：</span>
//               <span className="font-mono text-emerald-700">{order.trackingNumber}</span>
//             </div>

//             {trackingError && (
//               <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
//                 <AlertCircle className="w-5 h-5" />
//                 <span>{trackingError}</span>
//               </div>
//             )}

//             {trackingData?.success && trackingData.data?.route?.length > 0 ? (
//               <div className="relative">
//                 <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />
//                 {trackingData.data.route.map((log: any, i: number) => (
//                   <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
//                     <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full ring-8 ring-white">
//                       <div className="w-4 h-4 bg-emerald-600 rounded-full" />
//                     </div>
//                     <div className="flex-1 bg-gray-50 p-4 rounded-lg">
//                       <div className="flex justify-between items-start mb-1">
//                         <p className="font-medium text-lg">{log.opDesc}</p>
//                         <p className="text-sm text-gray-500">
//                           {format(new Date(log.opTime), "MM/dd HH:mm")}
//                         </p>
//                       </div>
//                       {log.opName && <p className="text-sm text-gray-600">{log.opName}</p>}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : trackingData && !trackingData.success ? (
//               <p className="text-center text-gray-500 py-8">暫無物流資訊</p>
//             ) : null}
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// }


// src/app/(user)/user/[userId]/order/[orderId]/OrderDetail.tsx

"use client";

import useSWR from "swr";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Truck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Order = {
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  trackingNumber?: string;
 
  items: Array<{
    title: string;
    image: string | null;
    size: string;
    quantity: number;
    price: number;
     isPicked: boolean;
  }>;
};

type SFTrackResponse =
  | { success: true; data: { route: Array<{ opDesc: string; opTime: string; opName?: string }> } }
  | { success: false; error?: string };

export default function OrderDetail({
  userId,
  orderId,
}: {
  userId: string;
  orderId: string;
}) {
  const { data: order, isLoading } = useSWR<Order>(
    `/api/user/${userId}/orders/${orderId}`,
    fetcher
  );

  const [trackingData, setTrackingData] = useState<SFTrackResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

const handleTrack = async () => {
  if (!order?.trackingNumber) return;

  setTrackingLoading(true);
  setTrackingError(null);
  setTrackingData(null);

  try {
    const res = await fetch("/api/sf-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber: order.trackingNumber }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `查詢失敗（HTTP ${res.status}）`);
    }

    const result: SFTrackResponse = await res.json();

    if (result.success) {
      setTrackingData(result);
    } else {
      setTrackingError(result.error || "查詢失敗");
    }
  } catch (err: unknown) {
    console.error("物流查詢錯誤:", err);
    if (err instanceof Error) {
      setTrackingError(err.message || "網路錯誤，請重試");
    } else {
      setTrackingError("發生未知錯誤，請重試");
    }
  } finally {
    setTrackingLoading(false);
  }
};

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-24 text-xl">訂單不存在</div>;
  }

  const hasNoTrackingInfo = trackingData?.success && trackingData.data.route.length === 0;

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <h1 className="text-4xl font-bold mb-8">訂單詳情</h1>

      {/* 訂單基本資訊（不變） */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl">訂單 {order.orderNumber}</CardTitle>
              <p className="text-gray-600 mt-2">
                下單時間：{format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")}
              </p>
            </div>
            <Badge
              variant={order.status === "pending" ? "secondary" : "default"}
              className="text-lg px-4 py-2"
            >
              {order.status === "pending" ? "待付款" : "已完成"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="font-semibold text-lg mb-3">收件資訊</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
              <p><span className="font-medium">收件人：</span> {order.shippingName}</p>
              <p><span className="font-medium">電話：</span> {order.shippingPhone}</p>
              <p className="md:col-span-2"><span className="font-medium">地址：</span> {order.shippingAddress}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">商品明細</h3>
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-4 py-4 border-b last:border-0">
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover border"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-lg">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    規格：{item.size} × {item.quantity} 件
                  </p>
                  <p className="text-xl font-bold text-primary mt-3">
                    ${(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-right text-3xl font-bold text-primary pt-6 border-t">
            總計：${order.total.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* 順豐物流追蹤區塊 */}
      {order.trackingNumber && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-7 h-7 text-emerald-600" />
                <CardTitle className="text-2xl">物流追蹤</CardTitle>
              </div>
              <Button
                onClick={handleTrack}
                disabled={trackingLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {trackingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    查詢中...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    查看最新狀態
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-lg font-medium mb-6">
              <span className="text-gray-600">運單號：</span>
              <span className="font-mono text-emerald-700">{order.trackingNumber}</span>
            </div>

            {trackingError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{trackingError}</span>
              </div>
            )}

            {hasNoTrackingInfo ? (
              <p className="text-center text-gray-500 py-8">暫無物流資訊</p>
            ) : trackingData?.success && trackingData.data.route.length > 0 ? (
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />
                {trackingData.data.route.map((log, i) => (
                  <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                    <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full ring-8 ring-white">
                      <div className="w-4 h-4 bg-emerald-600 rounded-full" />
                    </div>
                    <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-lg">{log.opDesc}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(log.opTime), "MM/dd HH:mm")}
                        </p>
                      </div>
                      {log.opName && <p className="text-sm text-gray-600">{log.opName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {order.items.every(item => item.isPicked) && (
  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
    <p className="text-blue-800 font-medium">
      ✅ 此訂單已備貨完成，感謝您的耐心等待！
    </p>
  </div>
)}
    </div>
  );
}