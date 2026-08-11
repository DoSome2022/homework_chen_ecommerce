// src/app/(admin)/admin/accountant/components/AccountList.tsx

"use client";

import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Landmark, Wallet, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Entry = {
  id: string;
  order: {
    orderNumber: string;
    shippingName: string;
    shippingPhone: string;
    createdAt: string;
    paymentMethod: string | null;
    items: { title: string }[];
  };
  totalAmount: number;
  shippingFee: number;
  productAmount: number;
  settledAt: string;
};

export default function AccountList() {
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  
  // ✅ 新增：月份選擇狀態 (格式: "2026-01")
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );

  const buildUrl = () => {
    let url = `/api/admin/accountant?search=${search}`;
    if (paymentMethod !== 'all') {
      url += `&paymentMethod=${paymentMethod}`;
    }
    return url;
  };

  const { data: entries = [], isLoading } = useSWR<Entry[]>(
    buildUrl(),
    fetcher,
    { revalidateOnFocus: false }
  );

  // ✅ 取得所選月份的日期範圍
  const { monthStart, monthEnd } = useMemo(() => {
    if (!selectedMonth) {
      const now = new Date();
      return {
        monthStart: startOfMonth(now),
        monthEnd: endOfMonth(now),
      };
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      monthStart: startOfMonth(date),
      monthEnd: endOfMonth(date),
    };
  }, [selectedMonth]);

  // ✅ 取得今天的日期範圍
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // ✅ 按付款方式分組統計 - 今日
  const todayStats = useMemo(() => {
    const todayEntries = entries.filter((e) => {
      const settledDate = new Date(e.settledAt);
      return settledDate >= todayStart && settledDate <= todayEnd;
    });

    const stats = {
      stripe: 0,
      bank_transfer: 0,
      cash: 0,
      total: 0,
    };

    todayEntries.forEach((e) => {
      const method = e.order.paymentMethod || 'unknown';
      if (method === 'stripe') stats.stripe += e.totalAmount;
      else if (method === 'bank_transfer') stats.bank_transfer += e.totalAmount;
      else if (method === 'cash') stats.cash += e.totalAmount;
      stats.total += e.totalAmount;
    });

    return stats;
  }, [entries, todayStart, todayEnd]);

  // ✅ 按付款方式分組統計 - 所選月份
  const monthStats = useMemo(() => {
    const monthEntries = entries.filter((e) => {
      const settledDate = new Date(e.settledAt);
      return settledDate >= monthStart && settledDate <= monthEnd;
    });

    const stats = {
      stripe: 0,
      bank_transfer: 0,
      cash: 0,
      total: 0,
    };

    monthEntries.forEach((e) => {
      const method = e.order.paymentMethod || 'unknown';
      if (method === 'stripe') stats.stripe += e.totalAmount;
      else if (method === 'bank_transfer') stats.bank_transfer += e.totalAmount;
      else if (method === 'cash') stats.cash += e.totalAmount;
      stats.total += e.totalAmount;
    });

    return stats;
  }, [entries, monthStart, monthEnd]);

  // ✅ 獲取總統計
  const totalStats = useMemo(() => {
    const stats = {
      stripe: 0,
      bank_transfer: 0,
      cash: 0,
      total: 0,
    };

    entries.forEach((e) => {
      const method = e.order.paymentMethod || 'unknown';
      if (method === 'stripe') stats.stripe += e.totalAmount;
      else if (method === 'bank_transfer') stats.bank_transfer += e.totalAmount;
      else if (method === 'cash') stats.cash += e.totalAmount;
      stats.total += e.totalAmount;
    });

    return stats;
  }, [entries]);

  // ✅ 生成可選的月份列表（從 2025年1月 到 現在）
  const availableMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    const startYear = 2025;
    const startMonth = 1;

    for (let year = startYear; year <= now.getFullYear(); year++) {
      const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
      const minMonth = year === startYear ? startMonth : 1;
      for (let month = minMonth; month <= maxMonth; month++) {
        months.push(`${year}-${String(month).padStart(2, '0')}`);
      }
    }
    return months.reverse(); // 最新的在前面
  }, []);

  // ✅ 付款方式圖示對應
  const getPaymentIcon = (method: string | null) => {
    if (method === "stripe") {
      return <CreditCard className="h-4 w-4 text-blue-600" />;
    } else if (method === "bank_transfer") {
      return <Landmark className="h-4 w-4 text-green-600" />;
    } else if (method === "cash") {
      return <Wallet className="h-4 w-4 text-amber-600" />;
    }
    return null;
  };

  // ✅ 付款方式顯示名稱
  const getPaymentLabel = (method: string | null) => {
    if (method === "stripe") return "信用卡 / 網上付款";
    if (method === "bank_transfer") return "銀行轉帳";
    if (method === "cash") return "現金付款";
    return "未指定";
  };

  // ✅ 格式化月份顯示
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    return `${year}年 ${month}月`;
  };

  // ✅ 切換到上個月
  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    if (month === 1) {
      setSelectedMonth(`${year - 1}-12`);
    } else {
      setSelectedMonth(`${year}-${String(month - 1).padStart(2, '0')}`);
    }
  };

  // ✅ 切換到下個月
  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (year === currentYear && month === currentMonth) {
      return; // 不能超過當前月份
    }
    
    if (month === 12) {
      setSelectedMonth(`${year + 1}-01`);
    } else {
      setSelectedMonth(`${year}-${String(month + 1).padStart(2, '0')}`);
    }
  };

  // ✅ 跳轉到今天
  const goToToday = () => {
    setSelectedMonth(format(new Date(), "yyyy-MM"));
  };

  return (
    <>
      {/* 搜尋和篩選 */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Input
          placeholder="搜尋訂單編號、姓名、電話、商品名稱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="全部付款方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部付款方式</SelectItem>
            <SelectItem value="stripe">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                信用卡 / 網上付款
              </div>
            </SelectItem>
            <SelectItem value="bank_transfer">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-green-600" />
                銀行轉帳
              </div>
            </SelectItem>
            <SelectItem value="cash">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-600" />
                現金付款(門市銷售記錄)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ✅ 月份選擇器 */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="font-medium">選擇月份：</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
          >
            ◀
          </Button>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {formatMonthDisplay(selectedMonth)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthDisplay(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            disabled={selectedMonth === format(new Date(), "yyyy-MM")}
          >
            ▶
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={goToToday}
          >
            本月
          </Button>
        </div>
        
        <div className="ml-auto text-sm text-gray-500">
          {formatMonthDisplay(selectedMonth)} 入帳統計
        </div>
      </div>

      {/* ✅ 統計卡片 - 所選月份 */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          📊 {formatMonthDisplay(selectedMonth)} 入帳統計
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                信用卡 / 網上付款
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-blue-600">
              ${monthStats.stripe.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4 text-green-600" />
                銀行轉帳
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-green-600">
              ${monthStats.bank_transfer.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-600" />
                現金付款(門市銷售記錄)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-amber-600">
              ${monthStats.cash.toLocaleString()}
            </CardContent>
          </Card>
          <Card className="border-blue-600 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                {formatMonthDisplay(selectedMonth)} 總計
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-blue-700">
              ${monthStats.total.toLocaleString()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✅ 統計卡片 - 今日 */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">📊 今日入帳統計</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                信用卡 / 網上付款
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-blue-600">
              ${todayStats.stripe.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4 text-green-600" />
                銀行轉帳
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-green-600">
              ${todayStats.bank_transfer.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-600" />
                現金付款(門市銷售記錄)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-amber-600">
              ${todayStats.cash.toLocaleString()}
            </CardContent>
          </Card>
          <Card className="border-green-600 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                今日總計
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-green-700">
              ${todayStats.total.toLocaleString()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✅ 總統計（折疊） */}
      <details className="mb-8">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          📊 查看全部入帳統計（總計）
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                信用卡 / 網上付款
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-blue-600">
              ${totalStats.stripe.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4 text-green-600" />
                銀行轉帳
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-green-600">
              ${totalStats.bank_transfer.toLocaleString()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-600" />
                現金付款(門市銷售記錄)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold text-amber-600">
              ${totalStats.cash.toLocaleString()}
            </CardContent>
          </Card>
          <Card className="border-purple-600 border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                全部總計
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-purple-700">
              ${totalStats.total.toLocaleString()}
            </CardContent>
          </Card>
        </div>
      </details>

      {/* 訂單列表 */}
      {isLoading ? (
        <div className="text-center py-12">載入中...</div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-semibold">#{entry.order.orderNumber}</p>
                    <p>客戶：{entry.order.shippingName}（{entry.order.shippingPhone}）</p>
                    <p>商品：{entry.order.items.map(i => i.title).join("、")}</p>
                    <p className="text-sm text-muted-foreground">
                      訂單時間：{format(new Date(entry.order.createdAt), "PPP p")}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {getPaymentIcon(entry.order.paymentMethod)}
                      <span className="text-sm font-medium">
                        付款方式：{getPaymentLabel(entry.order.paymentMethod)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${entry.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      入帳時間：{format(new Date(entry.settledAt), "PPP p")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}