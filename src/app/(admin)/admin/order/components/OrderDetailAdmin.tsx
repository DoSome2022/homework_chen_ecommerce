// src/app/(admin)/admin/orders/[orderId]/components/OrderDetailAdmin.tsx
"use client";

import useSWR from "swr";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Download, Edit, Save, X, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { updateTrackingNumberAction, updateOrderAction, processReturnRequest } from "@/action/Order/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settleOrderToAccountAction } from "@/action/Order/route";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleItemPickedAction, completePickingAction } from "@/action/Order/route";

// PDF 相關 import
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// 確保 date-fns 正確匯入
import { format } from "date-fns";

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
  notes?: string | null;

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

  returnRequest?: {
    id: string;
    reason: string;
    description?: string | null;
    images: string[];
    status: string;
    requestedAt: string;
    processedAt?: string | null;
    notes?: string | null;
  } | null;
};

// 定義更新數據的接口
interface UpdateData {
  status?: string;
  trackingNumber?: string | null;
  notes?: string;
  // 可以根據需要添加其他可更新字段
  shippingAddress?: string;
  shippingName?: string;
  shippingPhone?: string;
  preferredDeliveryTime?: string | null;
}

export default function OrderDetailAdmin({ orderId }: { orderId: string }) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 編輯模式狀態
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState("");
  const [editedTrackingNumber, setEditedTrackingNumber] = useState("");
  const [editedNotes, setEditedNotes] = useState("");

  const { data: order, isLoading, mutate } = useSWR<Order>(
    `/api/admin/orders/${orderId}`,
    fetcher
  );

  // 初始化編輯表單
  useEffect(() => {
    if (order) {
      setEditedStatus(order.status);
      setEditedTrackingNumber(order.trackingNumber || "");
      setEditedNotes(order.notes || "");
    }
  }, [order]);

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

  const handleSaveEdit = async () => {
    if (!order) return;

    const updates: UpdateData = {};

    if (editedStatus !== order.status) {
      updates.status = editedStatus;
    }
    if (editedTrackingNumber.trim() !== (order.trackingNumber || "")) {
      updates.trackingNumber = editedTrackingNumber.trim() || null;
    }
    if (editedNotes.trim() !== (order.notes || "")) {
      updates.notes = editedNotes.trim();
    }

    if (Object.keys(updates).length === 0) {
      toast.info("無任何變更");
      setIsEditing(false);
      return;
    }

    const result = await updateOrderAction(orderId, updates);

    if (result.success) {
      toast.success("訂單已更新");
      setIsEditing(false);
      mutate();
    } else {
      toast.error(result.error || "更新失敗");
    }
  };

  const exportToPDF = async () => {
    if (!contentRef.current) return;

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
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
      const imgY = 10;

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
      {/* 標題與按鈕 */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-4xl font-bold">訂單詳情 #{order.orderNumber}</h1>
        <div className="flex gap-3">
          <Button onClick={exportToPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            匯出為 PDF
          </Button>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "default" : "outline"}
          >
            {isEditing ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                完成編輯
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                編輯訂單
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左側：訂單資訊 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 顧客資訊 */}
          <Card>
            <CardHeader>
              <CardTitle>顧客資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p><strong>姓名：</strong> {order.shippingName}</p>
              <p><strong>電話：</strong> {order.shippingPhone}</p>
              <p><strong>地址：</strong> {order.shippingAddress}</p>
              <p><strong>下單者：</strong> {order.user.name} ({order.user.email})</p>
            </CardContent>
          </Card>

          {order.transferProofImg && (
            <Card>
              <CardHeader>
                <CardTitle>轉帳證明</CardTitle>
              </CardHeader>
              <CardContent>
                <Image
                  src={order.transferProofImg}
                  alt="轉帳證明"
                  width={300}
                  height={300}
                  className="mt-2 rounded-lg object-cover border"
                />
              </CardContent>
            </Card>
          )}

          {/* 物流資訊 */}
          <Card>
            <CardHeader>
              <CardTitle>物流資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p><strong>物流方式：</strong> {order.shippingMethod || "未選擇"}</p>
                <p><strong>期望送達時間：</strong> {order.preferredDeliveryTime || "不限"}</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="tracking">物流單號</Label>
                {isEditing ? (
                  <Input
                    id="tracking"
                    value={editedTrackingNumber}
                    onChange={(e) => setEditedTrackingNumber(e.target.value)}
                    placeholder="輸入順豐/黑貓等物流單號"
                  />
                ) : (
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
                )}
                {order.trackingNumber && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-medium">
                      目前物流單號：{order.trackingNumber}
                    </p>
                  </div>
                )}
              </div>

              {/* 入帳區塊 */}
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
                    已於 {order.accountEntry.settledAt ? format(new Date(order.accountEntry.settledAt), "yyyy-MM-dd HH:mm") : "未知時間"} 
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

        {/* 右側：訂單摘要 + 退貨處理 */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                訂單狀態
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={handleSaveEdit}>
                      <Save className="mr-1 h-4 w-4" />
                      保存
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="mr-1 h-4 w-4" />
                      取消
                    </Button>
                  </div>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 狀態 */}
              <div>
                <Label>訂單狀態</Label>
                {isEditing ? (
                  <Select value={editedStatus} onValueChange={setEditedStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="選擇狀態" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待處理</SelectItem>
                      <SelectItem value="paid">已付款</SelectItem>
                      <SelectItem value="shipped">已出貨</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge variant={order.status === "pending" ? "secondary" : "default"} className="text-lg px-6 py-2">
                      {order.status === "pending" ? "待處理" : "已完成"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* 物流單號 */}
              <div>
                <Label>物流單號</Label>
                {isEditing ? (
                  <Input
                    value={editedTrackingNumber}
                    onChange={(e) => setEditedTrackingNumber(e.target.value)}
                    placeholder="輸入物流單號"
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1">
                    {order.trackingNumber ? (
                      <p className="font-medium">{order.trackingNumber}</p>
                    ) : (
                      <p className="text-gray-500">尚未設定</p>
                    )}
                  </div>
                )}
              </div>

              {/* 備註 */}
              <div>
                <Label>管理員備註</Label>
                {isEditing ? (
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="輸入管理員備註..."
                    className="mt-1 min-h-[100px]"
                  />
                ) : (
                  <div className="mt-1 bg-gray-50 p-3 rounded-lg min-h-[80px]">
                    {order.notes || "無備註"}
                  </div>
                )}
              </div>

              <div className="text-right pt-4 border-t">
                <p className="text-3xl font-bold text-primary">
                  ${order.total.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 退貨申請處理區塊 */}
          {order.returnRequest && (
            <Card className={`mt-8 border-2 ${order.returnRequest.status === "PENDING" ? "border-red-400" : "border-gray-300"}`}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  退貨申請詳情
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">申請狀態</p>
                    <Badge
                      variant={
                        order.returnRequest.status === "PENDING" ? "destructive" :
                        order.returnRequest.status === "APPROVED" ? "default" :
                        order.returnRequest.status === "REJECTED" ? "secondary" : "outline"
                      }
                      className="mt-1"
                    >
                      {
                        order.returnRequest.status === "PENDING" ? "待審核" :
                        order.returnRequest.status === "APPROVED" ? "已批准" :
                        order.returnRequest.status === "REJECTED" ? "已拒絕" : "已退款"
                      }
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium">申請時間</p>
                    <p>{format(new Date(order.returnRequest.requestedAt), "yyyy-MM-dd HH:mm")}</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-2">退貨原因</p>
                  <p className="bg-gray-50 p-3 rounded-lg">{order.returnRequest.reason}</p>
                </div>

                {order.returnRequest.description && (
                  <div>
                    <p className="font-medium mb-2">詳細說明</p>
                    <p className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{order.returnRequest.description}</p>
                  </div>
                )}

                {order.returnRequest.images.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">證明圖片</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {order.returnRequest.images.map((img, i) => (
                        <Image key={i} src={img} alt="退貨證明" width={200} height={200} className="rounded-lg border" />
                      ))}
                    </div>
                  </div>
                )}

                {order.returnRequest.status === "PENDING" && (
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    <Button
                      onClick={async () => {
                        const notes = prompt("請輸入處理備註（選填）");
                        const result = await processReturnRequest(order.returnRequest!.id, "approve", notes || undefined);
                        if (result.success) {
                          toast.success(result.message);
                          mutate();
                        } else {
                          toast.error(result.error);
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      批准退貨
                    </Button>

                    <Button
                      onClick={async () => {
                        const notes = prompt("請輸入拒絕原因（會通知客戶）");
                        if (notes === null) return;
                        const result = await processReturnRequest(order.returnRequest!.id, "reject", notes);
                        if (result.success) {
                          toast.success(result.message);
                          mutate();
                        } else {
                          toast.error(result.error);
                        }
                      }}
                      variant="destructive"
                    >
                      拒絕退貨
                    </Button>

                    <Button
                      onClick={async () => {
                        if (!confirm("確認已完成退款？此動作不可逆！")) return;
                        const result = await processReturnRequest(order.returnRequest!.id, "refund");
                        if (result.success) {
                          toast.success("已標記為退款完成");
                          mutate();
                        } else {
                          toast.error(result.error);
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      已退款
                    </Button>
                  </div>
                )}

                {order.returnRequest.processedAt && (
                  <div className="text-sm text-gray-600 pt-4 border-t">
                    由管理員於 {format(new Date(order.returnRequest.processedAt), "yyyy-MM-dd HH:mm")} 處理
                    {order.returnRequest.notes && (
                      <p className="mt-2 text-gray-700 whitespace-pre-wrap">備註：{order.returnRequest.notes}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}