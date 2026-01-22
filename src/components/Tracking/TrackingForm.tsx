// src/app/components/TrackingForm.tsx
"use client";

import { useState } from "react";

interface TrackingFormProps {
  onQuery: (trackingNumbers: string) => void;
  loading: boolean;
  error: string | null;
}

export default function TrackingForm({ onQuery, loading, error }: TrackingFormProps) {
  const [trackingNumbers, setTrackingNumbers] = useState<string>('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onQuery(trackingNumbers);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuery(trackingNumbers);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        {/* 查詢類型選擇 */}
        <div>
          <label className="block text-lg font-semibold text-gray-800 mb-3">
            查詢類型
          </label>
          <select 
            defaultValue="1"
            className="w-full bg-gray-50 border-2 border-gray-300 rounded-xl px-5 py-3 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition duration-300"
            aria-label="查詢類型"
          >
            <option value="1">順豐運單號查詢</option>
            <option value="2" disabled>客戶訂單號查詢 (暫未開放)</option>
          </select>
        </div>

        {/* 運單號輸入 */}
        <div className="mt-6">
          <label htmlFor="tracking-numbers" className="block text-lg font-semibold text-gray-800 mb-3">
            運單號碼
          </label>
          <div className="space-y-2">
            <textarea
              id="tracking-numbers"
              value={trackingNumbers}
              onChange={(e) => setTrackingNumbers(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="請輸入運單號碼，多個請用逗號分隔
例如: SF1234567890, SF9876543210"
              rows={4}
              className="w-full bg-gray-50 border-2 border-gray-300 rounded-xl px-5 py-4 text-gray-700 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition duration-300"
              aria-label="運單號碼輸入框"
            />
            <p className="text-sm text-gray-500">
              可同時查詢多個運單，請用逗號（,）分隔，按 Enter 鍵可直接查詢
            </p>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 查詢按鈕 */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || !trackingNumbers.trim()}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition duration-300 ${
              loading || !trackingNumbers.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl text-white'
            }`}
            aria-label={loading ? '查詢中' : '開始查詢'}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 mr-3 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                查詢中...
              </div>
            ) : (
              '開始查詢'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}