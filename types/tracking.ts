// src/app/types/tracking.ts
export interface TrackingResult {
  acceptTime: string;
  acceptAddress?: string;
  remark?: string;
  orderId?: string;
  mailNo?: string;
  opCode?: string;
  remarkCode?: string;
  extraInfo?: Record<string, unknown>;
}

export interface RouteResp {
  routes?: TrackingResult[];
}

export interface MsgData {
  routeResps?: RouteResp[];
}

export interface ApiResultData {
  success: boolean;
  errorMsg?: string;
  msgData?: MsgData;
}

export interface ApiResponse {
  apiResultData?: string | ApiResultData;
}