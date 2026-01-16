// src/components/admin/RenewalListItem.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveRenewalRequest, rejectRenewalRequest } from "@/action/Renewal/route";

type RenewalRequestProps = {
  request: {
    id: string;
    user: { username: string };
    tierLevel: string;  // enum 值，如 "SILVER"
    requestedAt: Date;
  };
};

export default function RenewalListItem({ request }: RenewalRequestProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveRenewalRequest(request.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectRenewalRequest(request.id, "拒絕原因");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 修正日期顯示：使用固定格式，避免 locale 差異
  const formattedDate = request.requestedAt.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  }).replace(/\//g, '/');  // 確保一致格式

  // 或者更精確的固定格式（推薦使用 date-fns）
  // import { format } from 'date-fns';
  // import { zhTW } from 'date-fns/locale';
  // const formattedDate = format(request.requestedAt, 'yyyy/MM/dd a hh:mm:ss', { locale: zhTW });

  return (
    <li className="border p-4 rounded-md">
      <p>用戶：{request.user.username}</p>
      <p>申請等級：{request.tierLevel}</p>
      <p>請求時間：{formattedDate}</p>
      <div className="mt-2 space-x-2">
        <Button onClick={handleApprove} disabled={loading} variant="default">
          批准
        </Button>
        <Button onClick={handleReject} disabled={loading} variant="destructive">
          拒絕
        </Button>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </li>
  );
}