// src/app/(user)/checkout/success/SuccessClient.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { checkStripePaymentStatus } from "@/action/Order/route";
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Landmark, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SuccessClientProps {
  orderNumber?: string;
  userId?: string;
  paymentMethod?: "stripe" | "bank_transfer";
}

interface OrderDetails {
  finalTotal?: number;
  shippingMethod?: string | null; // 允許 null
  shippingFee?: number;
}

export default function SuccessClient({ 
  orderNumber, 
  userId,
  paymentMethod = "bank_transfer"
}: SuccessClientProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const methodFromUrl = searchParams.get("method");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("處理中...");
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({});

  // 決定使用的支付方式
  const actualPaymentMethod = methodFromUrl === "stripe" ? "stripe" : paymentMethod;

  useEffect(() => {
    async function verifyPayment() {
      if (actualPaymentMethod === "bank_transfer") {
        // 銀行轉帳：不需要驗證，直接顯示成功
        setStatus("success");
        setMessage("訂單已建立，請完成轉帳後上傳證明");
        return;
      }

      // Stripe 支付：需要驗證
      if (sessionId && orderNumber) {
        try {
          setStatus("loading");
          setMessage("正在驗證付款狀態...");

          // 呼叫後端 API 驗證支付狀態
          const result = await checkStripePaymentStatus(orderNumber, sessionId);

          if (result.success) {
            setStatus("success");
            setMessage(result.message || "付款成功！訂單已確認");
            
            // 如果有訂單詳細資訊，設定它們
            if (result.orderDetails) {
              setOrderDetails({
                finalTotal: result.orderDetails.finalTotal,
                shippingMethod: result.orderDetails.shippingMethod || undefined, // 將 null 轉為 undefined
                shippingFee: result.orderDetails.shippingFee
              });
            }
          } else {
            setStatus("failed");
            setMessage(result.error || "付款驗證失敗");
          }
        } catch (error) {
          console.error("驗證支付狀態失敗:", error);
          setStatus("failed");
          setMessage("驗證過程中發生錯誤，請聯繫客服");
        }
      } else {
        setStatus("failed");
        setMessage("缺少必要參數，無法驗證支付");
      }
    }

    verifyPayment();
  }, [orderNumber, sessionId, actualPaymentMethod]);

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

              {actualPaymentMethod === "bank_transfer" && orderNumber && userId && (
                <Button asChild variant="secondary" size="lg" className="min-w-[200px]">
                  <Link 
                    href={`/user/${userId}/order/${orderNumber}/upload-proof`}
                    className="flex items-center gap-2"
                  >
                    上傳轉帳證明
                  </Link>
                </Button>
              )}
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