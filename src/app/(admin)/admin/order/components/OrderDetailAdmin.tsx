"use client";

import useSWR from "swr";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import { useState, useRef } from "react";
import { updateTrackingNumberAction } from "@/action/Order/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settleOrderToAccountAction } from "@/action/Order/route";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleItemPickedAction, completePickingAction } from "@/action/Order/route";

// 新增：PDF 相關 import（客戶端專用）
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingMethod: string | null;
  preferredDeliveryTime: string | null;
  trackingNumber: string | null;

transferProofImg?: string | null;

  accountEntry?: {
    settledAt: string;
  } | null;

  items: Array<{
    id: string;
    title: string;
    image: string | null;
    size: string;
    quantity: number;
    price: number;
    isPicked: boolean;
  }>;

  user: {
    name: string | null;
    email: string | null;
  };
};

export default function OrderDetailAdmin({ orderId }: { orderId: string }) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null); // 用於捕捉整個內容

  const { data: order, isLoading, mutate } = useSWR<Order>(
    `/api/admin/orders/${orderId}`,
    fetcher
  );

  const handleUpdateTracking = async () => {
    if (!trackingNumber.trim()) {
      toast.error("請輸入物流單號");
      return;
    }

    setIsUpdating(true);
    const result = await updateTrackingNumberAction(orderId, trackingNumber.trim());

    if (result.success) {
      toast.success("物流單號已更新！");
      mutate();
    } else {
      toast.error(result.error || "更新失敗");
    }
    setIsUpdating(false);
  };

  // 新增：匯出 PDF 功能
  const exportToPDF = async () => {
    if (!contentRef.current) return;

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // 提升解析度，避免模糊
        useCORS: true, // 允許跨域圖片（如商品圖片）
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // 上邊距

      // 若內容過長，自動分頁
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", imgX, position + imgY, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save(`訂單_${order?.orderNumber || orderId}.pdf`);
      toast.success("PDF 已成功匯出！");
    } catch (error) {
      toast.error("匯出 PDF 失敗，請再試一次");
      console.error(error);
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

  return (
    <div ref={contentRef} className="max-w-5xl mx-auto py-12">
      {/* 新增：匯出 PDF 按鈕，置於標題旁 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">訂單詳情 #{order.orderNumber}</h1>
        <Button onClick={exportToPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          匯出為 PDF
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左側：訂單資訊 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 用戶資訊 */}
          <Card>
            <CardHeader>
              <CardTitle>顧客資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p><strong>姓名：</strong>{order.shippingName}</p>
              <p><strong>電話：</strong>{order.shippingPhone}</p>
              <p><strong>地址：</strong>{order.shippingAddress}</p>
              <p><strong>下單者：</strong>{order.user.name} ({order.user.email})</p>
            </CardContent>
          </Card>

        {order.transferProofImg && (
          <div className="mt-4">
            <Label>轉帳證明</Label>
            <Image
              src={order.transferProofImg}
              alt="轉帳證明"
              width={300}
              height={300}
              className="mt-2 rounded-lg"
            />
          </div>
        )}
          {/* 物流資訊 */}
          <Card>
            <CardHeader>
              <CardTitle>物流資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p><strong>物流方式：</strong>{order.shippingMethod || "未選擇"}</p>
                <p><strong>期望送達時間：</strong>{order.preferredDeliveryTime || "不限"}</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="tracking">物流單號</Label>
                <div className="flex gap-3">
                  <Input
                    id="tracking"
                    placeholder="輸入順豐/黑貓等物流單號"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    disabled={isUpdating}
                  />
                  <Button 
                    onClick={handleUpdateTracking}
                    disabled={isUpdating || !trackingNumber.trim()}
                  >
                    {isUpdating ? "更新中..." : "更新單號"}
                  </Button>
                </div>
                {order.trackingNumber && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-medium">
                      目前物流單號：{order.trackingNumber}
                    </p>
                  </div>
                )}
              </div>

              {order.status !== "pending" && !order.accountEntry && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 font-medium mb-4">
                    此訂單尚未入帳，可執行結算動作
                  </p>
                  <Button
                    onClick={async () => {
                      const result = await settleOrderToAccountAction(orderId);
                      if (result.success) {
                        toast.success(result.message);
                        mutate();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    結算了，可以入帳目
                  </Button>
                </div>
              )}

              {order.accountEntry && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    已於 {new Date(order.accountEntry.settledAt).toLocaleString("zh-TW")} 
                    由管理員入帳
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 商品明細 */}
          <Card>
            <CardHeader>
              <CardTitle>商品明細</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 border-b last:border-0 items-center">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      單位：{item.size} × {item.quantity}
                    </p>
                    <p className="text-lg font-bold text-primary mt-2">
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`picked-${item.id}`}
                      checked={item.isPicked}
                      onCheckedChange={async (checked) => {
                        const result = await toggleItemPickedAction(item.id, checked as boolean);
                        if (result.success) {
                          mutate();
                        } else {
                          toast.error("更新失敗");
                        }
                      }}
                    />
                    <Label htmlFor={`picked-${item.id}`} className="text-sm font-medium">
                      已備貨
                    </Label>
                  </div>
                </div>
              ))}

              {order.items.length > 0 && order.items.every(item => item.isPicked) && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-800 font-medium mb-4">
                    所有商品已備貨完畢
                  </p>
                  <Button
                    onClick={async () => {
                      const result = await completePickingAction(orderId);
                      if (result.success) {
                        toast.success("訂單備貨完成！");
                        mutate();
                      } else {
                        toast.error(result.error);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    標記備貨完成
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右側：訂單摘要 */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>訂單狀態</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge variant={order.status === "pending" ? "secondary" : "default"} className="text-lg px-6 py-3">
                  {order.status === "pending" ? "待處理" : "已完成"}
                </Badge>
              </div>

              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  ${order.total.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}