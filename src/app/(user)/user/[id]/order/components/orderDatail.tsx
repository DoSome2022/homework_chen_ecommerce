// src/app/(user)/user/[userId]/order/[orderId]/OrderDetail.tsx
"use client";

import useSWR, { mutate } from "swr";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Truck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { submitReturnRequest } from "@/action/Order/route";
import { toast } from "sonner";

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
  const orderKey = `/api/user/${userId}/orders/${orderId}`;
  
  const { data: order, isLoading } = useSWR<Order>(
    orderKey,
    fetcher
  );

  const [trackingData, setTrackingData] = useState<SFTrackResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

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
    } catch (error: unknown) {
      console.error("物流查詢錯誤:", error);
      if (error instanceof Error) {
        setTrackingError(error.message || "網路錯誤，請重試");
      } else {
        setTrackingError("發生未知錯誤，請重試");
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  // 退貨表單提交
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnReason) {
      toast.error("請選擇退貨原因");
      return;
    }

    setReturnSubmitting(true);

    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("reason", returnReason);
    formData.append("description", returnDescription);

    try {
      const result = await submitReturnRequest(formData);
      if (result.success) {
        toast.success(result.message);
        setShowReturnForm(false);
        // 修正：使用 orderKey 重新驗證訂單資料
        mutate(orderKey);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      // 這裡的 error 可以選擇性地使用，例如記錄到日誌
      console.error("退貨申請錯誤:", error);
      toast.error("提交失敗，請稍後再試");
    } finally {
      setReturnSubmitting(false);
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

  const canRequestReturn = ["paid", "shipped"].includes(order.status) && 
                          !order.status.includes("return");

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <h1 className="text-4xl font-bold mb-8">訂單詳情</h1>

      {/* 訂單基本資訊 */}
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

      {/* 備貨完成提示 */}
      {order.items.every(item => item.isPicked) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-blue-800 font-medium">
            ✅ 此訂單已備貨完成，感謝您的耐心等待！
          </p>
        </div>
      )}

      {/* 退貨申請按鈕與表單 */}
      {canRequestReturn && (
        <div className="mt-8">
          {!showReturnForm ? (
            <Button
              variant="destructive"
              size="lg"
              className="w-full md:w-auto"
              onClick={() => setShowReturnForm(true)}
            >
              申請退貨 / 退款
            </Button>
          ) : (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700">退貨申請</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  請說明退貨原因，我們將在 3 個工作天內審核
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReturn} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      退貨原因 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full border rounded-md p-3 focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="">請選擇原因</option>
                      <option value="商品損壞或瑕疵">商品損壞或瑕疵</option>
                      <option value="與描述不符">與描述不符</option>
                      <option value="尺寸/規格不合">尺寸/規格不合</option>
                      <option value="不喜歡/改變主意">不喜歡/改變主意</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      詳細說明（選填）
                    </label>
                    <textarea
                      value={returnDescription}
                      onChange={(e) => setReturnDescription(e.target.value)}
                      className="w-full border rounded-md p-3 h-32 focus:ring-2 focus:ring-red-500"
                      placeholder="請描述具體問題、照片證明等..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      type="submit"
                      disabled={returnSubmitting}
                      variant="destructive"
                      className="flex-1"
                    >
                      {returnSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          提交中...
                        </>
                      ) : (
                        "確認提交退貨申請"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowReturnForm(false)}
                      className="flex-1"
                    >
                      取消
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 已申請退貨提示 */}
      {order.status.includes("return") && (
        <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-600 mb-4" />
          <h3 className="text-xl font-semibold text-amber-800 mb-2">
            退貨申請處理中
          </h3>
          <p className="text-gray-700">
            我們已收到您的退貨申請，將在 3 個工作天內審核並通知您結果。
          </p>
        </div>
      )}
    </div>
  );
}