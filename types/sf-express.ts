// ./types/sf-express.ts （建議獨立檔案，未來可重用）
export interface SfApiResponse {
  apiResultCode?: string;
  apiResultMsg?: string;
  apiResultData?: unknown; // 或更具體的型別
  // 成功時可能有的其他欄位...
  [key: string]: unknown;
}

export interface SfErrorResponse extends SfApiResponse {
  apiResultCode: string; // 錯誤時一定存在
}