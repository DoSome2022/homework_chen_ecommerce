// src/app/TrackingPageClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import TrackingForm from "./TrackingForm";
import TrackingResults from "./TrackingResults";

// 定義類型（與原來的相同）
interface TrackingResult {
  acceptTime: string;
  acceptAddress?: string;
  remark?: string;
  orderId?: string;
  mailNo?: string;
  opCode?: string;
  remarkCode?: string;
  extraInfo?: Record<string, unknown>;
}

interface RouteResp {
  routes?: TrackingResult[];
}

interface MsgData {
  routeResps?: RouteResp[];
}

interface ApiResultData {
  success: boolean;
  errorMsg?: string;
  msgData?: MsgData;
}

interface ApiResponse {
  apiResultData?: string | ApiResultData;
}

export default function TrackingPageClient() {
  const [results, setResults] = useState<TrackingResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 格式化時間顯示（可在 Client Component 中使用）
  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return timeString;
    }
  };

  // 處理查詢請求
  const handleQuery = async (trackingNumbers: string) => {
    if (!trackingNumbers.trim()) {
      setError('請輸入運單號碼');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const numbers = trackingNumbers.split(',').map(s => s.trim());
      
      const msgData = {
        language: '0' as const,
        trackingType: 1 as const,
        trackingNumber: numbers,
        methodType: 1 as const
      };

      const body = { 
        serviceCode: 'EXP_RECE_SEARCH_ROUTES' as const, 
        msgData 
      };

      const response = await fetch('/api/sf-api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API請求失敗: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      // 解析嵌套 JSON
      let apiResultData: ApiResultData | undefined;
      
      if (typeof data.apiResultData === 'string') {
        try {
          apiResultData = JSON.parse(data.apiResultData);
        } catch {
          throw new Error('API返回數據格式錯誤');
        }
      } else {
        apiResultData = data.apiResultData;
      }

      if (!apiResultData?.success) {
        throw new Error(apiResultData?.errorMsg || '接口返回失敗');
      }

      // 取出所有路由節點
      const routes = apiResultData.msgData?.routeResps?.flatMap((r) => r.routes || []) || [];
      
      if (!routes.length) {
        setResults([]);
        setError('暫無路由信息');
        return;
      }

      // 按 acceptTime 升序排序
      const sortedRoutes = [...routes].sort((a, b) => 
        new Date(a.acceptTime).getTime() - new Date(b.acceptTime).getTime()
      );

      setResults(sortedRoutes);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || '查詢失敗');
      } else {
        setError('查詢失敗');
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 頂部導航區域 */}
        <div className="flex justify-end mb-6 space-x-6">
          <Link 
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            登入
          </Link>
          <Link 
            href="/register"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            註冊
          </Link>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 頁面標題 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
            <h1 className="text-3xl font-bold text-white text-center">
              訂單運送查詢
            </h1>
            <p className="text-blue-100 text-center mt-2">
              實時查詢順豐快遞運單狀態
            </p>
          </div>

          {/* 查詢表單和結果區域 */}
          <div className="p-8">
            <TrackingForm 
              onQuery={handleQuery}
              loading={loading}
              error={error}
            />

            {/* 查詢結果 */}
            {results.length > 0 && (
              <TrackingResults 
                results={results}
                formatTime={formatTime}
              />
            )}
          </div>
        </div>

        {/* 頁腳說明 */}
        <footer className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            本系統使用順豐官方 API 接口，數據實時更新
          </p>
          <p className="text-gray-500 text-xs mt-2">
            如有問題，請聯繫系統管理員
          </p>
        </footer>
      </div>
    </div>
  );
}