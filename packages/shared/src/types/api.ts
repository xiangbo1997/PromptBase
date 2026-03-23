export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  requestId?: string;
  timestamp: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
  meta: ApiMeta;
}
