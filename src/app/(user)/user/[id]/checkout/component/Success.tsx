// src/app/(user)/checkout/success/SuccessClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { checkStripePaymentStatus } from "@/action/Order/route";
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Landmark, FileText, Wallet } from "lucide-react";
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
  paymentMethod?: "stripe" | "bank_transfer" | "cash";  // ✅ 加入 cash
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
  paymentMethod: propPaymentMethod,  // ✅ 接收從父層傳入的付款方式
}: SuccessClientProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const urlOrderId = searchParams.get("orderId");
  const methodFromUrl = searchParams.get("method"); // ✅ 從 URL 獲取 method
  
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("處理中...");
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({});
  const [hasProcessed, setHasProcessed] = useState(false);

  // ✅ 判斷付款方式：優先使用 prop，再來 URL 參數，最後自動判斷
  const getPaymentMethod = useCallback(() => {
    if (propPaymentMethod) return propPaymentMethod;
    if (methodFromUrl === 'cash') return 'cash';
    if (methodFromUrl === 'bank_transfer') return 'bank_transfer';
    if (sessionId) return 'stripe';
    return 'bank_transfer'; // 預設
  }, [propPaymentMethod, methodFromUrl, sessionId]);

  const actualPaymentMethod = getPaymentMethod();

  // 轉換函數
  const convertOrderDetails = useCallback((details: RawOrderDetails | null | undefined): OrderDetails => {
    if (!details) return {};
      
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
        methodFromUrl,
        propPaymentMethod,
        actualPaymentMethod,
        hasSessionId: !!sessionId,
      });

      // ✅ 現金付款：直接顯示成功，不需要驗證
      if (actualPaymentMethod === 'cash') {
        console.log('[SuccessClient] 現金付款，直接顯示成功');
        setStatus("success");
        setMessage("訂單已建立！請於門市取貨時支付現金。");
        setHasProcessed(true);
        
        // 獲取訂單詳情
        if (urlOrderId) {
          try {
            const res = await fetch(`/api/orders/${urlOrderId}/summary`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.order) {
                setOrderDetails({
                  finalTotal: data.order.total || data.order.finalTotal,
                  shippingMethod: data.order.shippingMethod || undefined,
                  shippingFee: data.order.shippingFee || 0,
                });
              }
            }
          } catch (error) {
            console.error('獲取訂單詳情失敗:', error);
          }
        }
        return;
      }

      // 銀行轉帳：直接顯示成功
      if (actualPaymentMethod === 'bank_transfer') {
        console.log('[SuccessClient] 銀行轉帳，直接顯示成功');
        setStatus("success");
        setMessage("訂單已建立！請完成銀行轉帳並上傳證明。");
        setHasProcessed(true);
        
        // 獲取訂單詳情
        if (urlOrderId) {
          try {
            const res = await fetch(`/api/orders/${urlOrderId}/summary`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.order) {
                setOrderDetails({
                  finalTotal: data.order.total || data.order.finalTotal,
                  shippingMethod: data.order.shippingMethod || undefined,
                  shippingFee: data.order.shippingFee || 0,
                });
              }
            }
          } catch (error) {
            console.error('獲取訂單詳情失敗:', error);
          }
        }
        return;
      }

      // Stripe 付款：需要驗證
      if (!sessionId) {
        console.log('[SuccessClient] 無 session_id，但也不是現金/銀行轉帳');
        setStatus("failed");
        setMessage("無法識別付款方式，請聯繫客服");
        return;
      }

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
            setHasProcessed(true);
            setStatus("success");
            setMessage("付款成功！正式訂單已建立，購物車已清空");
            
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
  }, [urlOrderId, sessionId, hasProcessed, convertOrderDetails, actualPaymentMethod, methodFromUrl, propPaymentMethod]);

  // 取得訂單詳細資訊（僅在成功時）
  useEffect(() => {
    if (orderNumber && status === "success" && actualPaymentMethod !== 'cash') {
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
        });
    }
  }, [orderNumber, status, actualPaymentMethod]);

  // 輔助函數
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return "-";
    return `$${amount.toLocaleString()}`;
  };

  const getShippingMethodDisplay = (method?: string | null) => {
    if (!method) return "未指定";
    return method === "delivery" ? "宅配到府" : "門市自取";
  };

  // ✅ 獲取付款方式的顯示名稱和圖示
  const getPaymentDisplay = () => {
    switch (actualPaymentMethod) {
      case 'stripe':
        return { label: '信用卡 / 電子支付', icon: <CreditCard className="h-5 w-5 text-blue-600" />, color: 'blue' };
      case 'bank_transfer':
        return { label: '銀行轉帳', icon: <Landmark className="h-5 w-5 text-green-600" />, color: 'green' };
      case 'cash':
        return { label: '現金付款', icon: <Wallet className="h-5 w-5 text-amber-600" />, color: 'amber' };
      default:
        return { label: '未知方式', icon: null, color: 'gray' };
    }
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
        const paymentDisplay = getPaymentDisplay();
        return (
          <div className="space-y-8">
            {/* 成功圖標和標題 */}
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className={`h-32 w-32 rounded-full flex items-center justify-center ${
                  actualPaymentMethod === 'cash' ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  {actualPaymentMethod === 'cash' ? (
                    <Wallet className="h-20 w-20 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-20 w-20 text-green-600" />
                  )}
                </div>
                <Badge className={`absolute -top-2 -right-2 text-white text-lg py-1 px-3 ${
                  actualPaymentMethod === 'cash' ? 'bg-amber-600' : 'bg-green-600'
                }`}>
                  {actualPaymentMethod === 'cash' ? '待付款' : '成功'}
                </Badge>
              </div>

              <h1 className={`text-4xl font-bold mb-2 ${
                actualPaymentMethod === 'cash' ? 'text-amber-700' : 'text-green-700'
              }`}>
                {actualPaymentMethod === 'cash' ? '訂單已建立！' : '付款成功！'}
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
                    {paymentDisplay.icon}
                    <span className="text-gray-600">支付方式</span>
                  </div>
                  <Badge variant="outline" className={
                    actualPaymentMethod === 'stripe' 
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : actualPaymentMethod === 'cash'
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }>
                    {paymentDisplay.label}
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
                      <span className={actualPaymentMethod === 'cash' ? 'text-amber-700' : 'text-green-700'}>
                        {formatCurrency(orderDetails.finalTotal)}
                      </span>
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

                {/* ✅ 現金付款專屬資訊 */}
                {actualPaymentMethod === 'cash' && (
                  <div className="pt-4 border-t">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800 mb-2">💰 現金付款說明</h4>
                          <ul className="text-sm text-amber-700 space-y-1">
                            <li>• 請於門市取貨時支付現金</li>
                            <li>• 或等待送貨員上門收款</li>
                            <li>• 訂單已確認，我們會盡快為您處理</li>
                            {orderDetails.shippingMethod === 'pickup' && (
                              <li className="font-medium mt-2">
                                📍 門市地址：九龍深水埗大南街67號舖地下B舖
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
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
                            <li>• 轉帳帳號：039-735-2-008237-9（集友銀行）</li>
                            <li>• 轉帳金額：{orderDetails.finalTotal ? formatCurrency(orderDetails.finalTotal) : "請查看訂單"}</li>
                            <li>• 轉帳後請至「我的訂單」上傳轉帳證明</li>
                          </ul>
                        </div>
                      </div>
                    </div>
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

        <div className="mt-10 text-center text-sm text-gray-500">
          <p>如有任何疑問，請聯繫我們</p>
          <p className="mt-1">客服電話：97912581 | 服務時間：09:00-18:00</p>
          <p className="mt-1">電子郵件：dechang1127@gmail.com</p>
        </div>
      </div>
    </div>
  );
}