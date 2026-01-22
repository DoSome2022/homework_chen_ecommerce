// src/app/components/TrackingResults.tsx
"use client";

import { TrackingResult } from "../../../types/tracking";



interface TrackingResultsProps {
  results: TrackingResult[];
  formatTime: (timeString: string) => string;
}

export default function TrackingResults({ results, formatTime }: TrackingResultsProps) {
  return (
    <div className="mt-12">
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          查詢結果
          <span className="ml-3 text-sm font-normal text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {results.length} 條記錄
          </span>
        </h2>

        {/* 時間軸顯示 */}
        <div className="space-y-4">
          {results.map((route, index) => (
            <div 
              key={`${route.acceptTime}-${index}`}
              className="relative pl-10 pb-6 last:pb-0"
            >
              {/* 時間軸線 */}
              {index < results.length - 1 && (
                <div className="absolute left-5 top-8 bottom-0 w-0.5 bg-blue-200" aria-hidden="true"></div>
              )}
              
              {/* 時間點 */}
              <div className="absolute left-0 top-1 w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg" aria-hidden="true">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>

              {/* 內容卡片 */}
              <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <time className="text-lg font-bold text-gray-900" dateTime={route.acceptTime}>
                        {formatTime(route.acceptTime)}
                      </time>
                      {index === results.length - 1 && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          最新狀態
                        </span>
                      )}
                    </div>
                    {route.acceptAddress && (
                      <p className="text-gray-600 mt-1">
                        <span className="inline-flex items-center">
                          <svg className="w-4 h-4 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {route.acceptAddress}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                      狀態更新
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-800 leading-relaxed">
                    {route.remark || '無詳細描述'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 統計信息 */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">
                最早時間: {formatTime(results[0]?.acceptTime)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">
                最新時間: {formatTime(results[results.length - 1]?.acceptTime)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">
                總記錄數: {results.length} 條
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}