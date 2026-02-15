export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    statusCode: number;
    message: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
