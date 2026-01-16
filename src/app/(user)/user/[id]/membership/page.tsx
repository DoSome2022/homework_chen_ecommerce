'use client';

import { useState } from 'react';
import { useMembership } from '@/context/MembershipContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { submitRenewalRequest } from '@/action/Renewal/route';
import { Loader2 } from 'lucide-react';

export default function MembershipPage() {
  const { level, isExpired, endsAt } = useMembership();
  const [selectedLevel, setSelectedLevel] = useState<string>('SILVER');
  const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  if (!selectedLevel) {
    toast.error('請選擇要升級/續訂的等級');
    return;
  }

  setLoading(true);
  try {
    const result = await submitRenewalRequest(selectedLevel);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error('申請失敗，請稍後再試');
    }
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : '發生未知錯誤，請稍後再試';
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">會員資格管理</h1>

      {/* 目前會員資訊 */}
      <div className="bg-gray-50 border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">目前會員狀態</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">等級：</span> {level}
          </p>
          <p>
            <span className="font-medium">狀態：</span>{' '}
            {isExpired ? (
              <span className="text-red-600">已過期</span>
            ) : (
              <span className="text-green-600">有效</span>
            )}
          </p>
          {endsAt && (
            <p>
              <span className="font-medium">到期日期：</span>{' '}
              {endsAt.toLocaleDateString('zh-TW')}
            </p>
          )}
        </div>
      </div>

      {/* 升級 / 續訂區塊 */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          {level === 'FREE' ? '升級會員資格' : '續訂或升級會員資格'}
        </h2>

        <p className="text-gray-600 mb-6">
          {level === 'FREE'
            ? '您的帳號目前為免費會員，升級後可享更多優惠與專屬權益。'
            : '您的會員資格即將到期或已過期，請選擇續訂目前等級或升級更高階方案。'}
        </p>

        <div className="space-y-6">
          {/* 等級選擇 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              選擇等級
            </label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="選擇會員等級" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SILVER">銀級會員 </SelectItem>
                <SelectItem value="GOLD">金級會員 </SelectItem>
                <SelectItem value="PLATINUM">白金會員 </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 提交按鈕 */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedLevel}
            className="w-full md:w-auto"
            size="lg"
          >
            {loading ? (
              <>
                提交中... <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : level === 'FREE' ? (
              '提交升級申請'
            ) : (
              '提交續訂/升級申請'
            )}
          </Button>

          {/* 提示文字 */}
          <p className="text-sm text-gray-500">
            申請提交後將由管理員審核，審核通過後系統將自動更新您的會員資格。
          </p>
        </div>
      </div>
    </div>
  );
}