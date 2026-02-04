
// src/app/(user)/checkout/success/SuccessClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { checkStripePaymentStatus } from "@/action/Order/route";
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Landmark, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createOrderFromTemp } from "@/action/Order/route";

interface RawOrderDetails {
  總金額?: number;
  finalTotal?: number;
  運費?: number;
  shippingFee?: number;
  商品金額?: number;
  productAmount?: number;
  shippingMethod?: string | null;
  支付狀態?: string;
  paymentStatus?: string;
  paidAt?: Date | string | null;
}

interface SuccessClientProps {
  orderNumber?: string;
  userId?: string;
  paymentMethod?: "stripe" | "bank_transfer";
}

interface OrderDetails {
  finalTotal?: number;
  shippingMethod?: string | null;
  shippingFee?: number;
  productAmount?: number;
  paymentStatus?: string;
  paidAt?: Date;
}

export default function SuccessClient({ 
  orderNumber, 
  userId,
}: SuccessClientProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const urlOrderId   = searchParams.get("orderId");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("處理中...");
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({});
  const isStripePayment = !!sessionId;
  const actualPaymentMethod = isStripePayment ? "stripe" : "bank_transfer";
  const [hasProcessed, setHasProcessed] = useState(false);

  // 轉換函數 - 使用 useCallback 優化
  const convertOrderDetails = useCallback((details: RawOrderDetails | null | undefined): OrderDetails => {
    if (!details) return {};
      
    // 處理中文屬性名
    return {
      finalTotal: details.總金額 ?? details.finalTotal,
      shippingFee: details.運費 ?? details.shippingFee,
      productAmount: details.商品金額 ?? details.productAmount,
      shippingMethod: details.shippingMethod ?? undefined,
      paymentStatus: details.支付狀態 ?? details.paymentStatus ?? undefined,
      paidAt: details.paidAt ? new Date(details.paidAt) : undefined,
    };
  }, []);

  useEffect(() => {
    if (hasProcessed) {
      console.log('[SuccessClient] 已處理過本次支付，不重複執行');
      return;
    }

    async function verifyPayment() {
      console.log('[SuccessClient] useEffect 觸發', {
        urlOrderId,
        sessionId,
        hasSessionId: !!sessionId,
        inferredMethod: !!sessionId ? "stripe" : "bank_transfer"
      });

      // 改用 sessionId 判斷是否為 Stripe
      if (!sessionId) {
        // 沒有 session_id → 視為銀行轉帳或其他非 Stripe
        console.log('[SuccessClient] 無 session_id，走非 Stripe 流程');
        setStatus("success");
        setMessage("訂單已建立（非信用卡支付）");
        return;
      }

      // 有 session_id → Stripe 支付
      if (!urlOrderId) {
        console.warn('[SuccessClient] 缺少 orderId');
        setStatus("failed");
        setMessage("缺少訂單參數，請聯繫客服");
        return;
      }

      try {
        setStatus("loading");
        setMessage("正在驗證 Stripe 付款並轉換訂單...");

        console.log('[SuccessClient] 開始驗證 Stripe', { orderId: urlOrderId, sessionId });

        const result = await checkStripePaymentStatus(urlOrderId, sessionId);

        console.log('[SuccessClient] checkStripePaymentStatus 回傳:', result);

        if (result.success) {
          console.log('[SuccessClient] 準備呼叫 createOrderFromTemp');

          const orderResult = await createOrderFromTemp(urlOrderId);

          console.log('[SuccessClient] createOrderFromTemp 回傳:', orderResult);

          if (orderResult.success) {
            setHasProcessed(true);  // 成功後標記已處理
            setStatus("success");
            setMessage("付款成功！正式訂單已建立，購物車已清空");
            
            // 使用 convertOrderDetails 處理返回的訂單詳情
            if (result.orderDetails) {
              const convertedDetails = convertOrderDetails(result.orderDetails);
              setOrderDetails(convertedDetails);
            }
          } else {
            setStatus("failed");
            setMessage(orderResult.error || "訂單轉換失敗");
          }
        } else {
          setStatus("failed");
          setMessage(result.error || "付款驗證失敗");
        }
      } catch (error) {
        console.error("[SuccessClient] 完整錯誤:", error);
        setStatus("failed");
        setMessage("處理過程中發生錯誤，請聯繫客服");
      }
    }

    verifyPayment();
  }, [urlOrderId, sessionId, hasProcessed, convertOrderDetails]); // 添加 hasProcessed 和 convertOrderDetails 到依賴陣列

  // 取得訂單詳細資訊
  useEffect(() => {
    if (orderNumber && status === "success") {
      fetch(`/api/orders/${orderNumber}/summary`)
        .then(res => {
          if (!res.ok) throw new Error("API 請求失敗");
          return res.json();
        })
        .then(data => {
          if (data.success && data.order) {
            setOrderDetails({
              finalTotal: data.order.finalTotal,
              shippingMethod: data.order.shippingMethod || undefined,
              shippingFee: data.order.shippingFee
            });
          }
        })
        .catch(error => {
          console.error("取得訂單詳細資訊失敗:", error);
          // 可以選擇不處理，因為已有基本資訊
        });
    }
  }, [orderNumber, status]);

  // 輔助函數：安全轉換金額顯示
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return "-";
    return `$${amount.toLocaleString()}`;
  };

  // 輔助函數：安全顯示配送方式
  const getShippingMethodDisplay = (method?: string | null) => {
    if (!method) return "未指定";
    return method === "delivery" ? "宅配到府" : "門市自取";
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="animate-pulse">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-20 w-20 animate-spin text-blue-600 mb-6" />
              <h2 className="text-2xl font-semibold mb-2">正在處理...</h2>
              <p className="text-gray-600">{message}</p>
              {actualPaymentMethod === "stripe" && (
                <p className="text-sm text-gray-500 mt-4">
                  正在向 Stripe 驗證付款狀態，請稍候...
                </p>
              )}
            </div>
          </div>
        );

      case "success":
        return (
          <div className="space-y-8">
            {/* 成功圖標和標題 */}
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="h-32 w-32 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-20 w-20 text-green-600" />
                </div>
                <Badge className="absolute -top-2 -right-2 bg-green-600 text-white text-lg py-1 px-3">
                  成功
                </Badge>
              </div>

              <h1 className="text-4xl font-bold text-green-700 mb-2">
                {actualPaymentMethod === "stripe" ? "付款成功！" : "訂單建立成功！"}
              </h1>
              <p className="text-xl text-gray-700 mb-6">{message}</p>
            </div>

            {/* 訂單資訊卡片 */}
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 border">
              <div className="space-y-4">
                {/* 訂單編號 */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-gray-600">訂單編號</span>
                  <span className="font-mono text-lg font-bold text-gray-900">
                    {orderNumber || "N/A"}
                  </span>
                </div>

                {/* 支付方式 */}
                <div className="flex items-center justify-between py-4 border-b">
                  <div className="flex items-center gap-2">
                    {actualPaymentMethod === "stripe" ? (
                      <>
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <span className="text-gray-600">支付方式</span>
                      </>
                    ) : (
                      <>
                        <Landmark className="h-5 w-5 text-green-600" />
                        <span className="text-gray-600">支付方式</span>
                      </>
                    )}
                  </div>
                  <Badge variant="outline" className={
                    actualPaymentMethod === "stripe" 
                      ? "bg-blue-50 text-blue-700 border-blue-200" 
                      : "bg-green-50 text-green-700 border-green-200"
                  }>
                    {actualPaymentMethod === "stripe" ? "信用卡支付" : "銀行轉帳"}
                  </Badge>
                </div>

                {/* 金額資訊 */}
                {orderDetails.finalTotal !== undefined && (
                  <div className="space-y-3 py-4 border-b">
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品金額</span>
                      <span>{formatCurrency(
                        orderDetails.finalTotal - (orderDetails.shippingFee || 0)
                      )}</span>
                    </div>
                    {orderDetails.shippingFee !== undefined && orderDetails.shippingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">運費</span>
                        <span>{formatCurrency(orderDetails.shippingFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>總金額</span>
                      <span className="text-green-700">{formatCurrency(orderDetails.finalTotal)}</span>
                    </div>
                  </div>
                )}

                {/* 配送方式 */}
                {orderDetails.shippingMethod !== undefined && (
                  <div className="flex items-center justify-between py-4">
                    <span className="text-gray-600">配送方式</span>
                    <Badge variant="secondary">
                      {getShippingMethodDisplay(orderDetails.shippingMethod)}
                    </Badge>
                  </div>
                )}

                {/* 交易編號（僅 Stripe） */}
                {actualPaymentMethod === "stripe" && sessionId && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600 mb-1">交易編號</div>
                    <div className="font-mono text-sm bg-gray-100 p-2 rounded-md truncate">
                      {sessionId}
                    </div>
                  </div>
                )}

                {/* 銀行轉帳資訊 */}
                {actualPaymentMethod === "bank_transfer" && (
                  <div className="pt-4 border-t">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 mb-2">請完成銀行轉帳</h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• 請在 24 小時內完成轉帳</li>
                            <li>• 轉帳帳號：1234-5678-9012（XX銀行）</li>
                            <li>• 轉帳金額：{orderDetails.finalTotal ? formatCurrency(orderDetails.finalTotal) : "請查看訂單"}</li>
                            <li>• 轉帳後請至「我的訂單」上傳轉帳證明</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              {userId ? (
                <Button asChild size="lg" className="min-w-[200px]">
                  <Link href={`/user/${userId}/order`} className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    查看我的訂單
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="min-w-[200px]">
                  <Link href="/login" className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    登入查看訂單
                  </Link>
                </Button>
              )}

              <Button asChild variant="outline" size="lg" className="min-w-[200px]">
                <Link href="/" className="flex items-center gap-2">
                  繼續購物
                </Link>
              </Button>

              {/* {actualPaymentMethod === "bank_transfer" && orderNumber && userId && (
                <Button asChild variant="secondary" size="lg" className="min-w-[200px]">
                  <Link 
                    href={`/user/${userId}/order/${orderNumber}/upload-proof`}
                    className="flex items-center gap-2"
                  >
                    上傳轉帳證明
                  </Link>
                </Button>
              )} */}
            </div>

            {/* 提示訊息 */}
            <div className="text-center text-sm text-gray-500 pt-6">
              <p>訂單詳細資訊已發送至您的電子郵件</p>
              <p className="mt-1">如有任何問題，請聯繫客服</p>
            </div>
          </div>
        );

      case "failed":
        return (
          <div className="space-y-8">
            <div className="flex flex-col items-center">
              <div className="h-32 w-32 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-20 w-20 text-red-600" />
              </div>
              <h1 className="text-4xl font-bold text-red-700 mb-2">付款失敗</h1>
              <p className="text-xl text-gray-700 mb-6">{message}</p>
            </div>

            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 border">
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">訂單可能未被處理，請檢查：</p>
                  <ul className="text-left text-gray-700 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      信用卡是否有效且餘額充足
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      網路連線是否正常
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      是否已超過付款時間限制
                    </li>
                  </ul>
                </div>

                {orderNumber && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">訂單編號</div>
                    <div className="font-mono font-bold">{orderNumber}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="min-w-[200px]">
                <Link href="/checkout" className="flex items-center gap-2">
                  重新結帳
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="min-w-[200px]">
                <Link href="/cart" className="flex items-center gap-2">
                  返回購物車
                </Link>
              </Button>

              <Button asChild variant="secondary" size="lg" className="min-w-[200px]">
                <Link href="/contact" className="flex items-center gap-2">
                  聯繫客服
                </Link>
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">訂單結果</h1>
          <p className="text-gray-600 mt-2">您的訂單處理狀態</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10">
          {renderContent()}
        </div>

        {/* 頁尾資訊 */}
        <div className="mt-10 text-center text-sm text-gray-500">
          <p>如有任何疑問，請聯繫我們</p>
          <p className="mt-1">客服電話：02-1234-5678 | 服務時間：09:00-18:00</p>
          <p className="mt-1">電子郵件：support@example.com</p>
        </div>
      </div>
    </div>
  );
}
