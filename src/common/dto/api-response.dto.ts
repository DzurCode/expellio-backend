export class ApiResponseDto<T> {
  data: T;
  meta?: any;
  message?: string;

  constructor(data: T, meta?: any, message?: string) {
    this.data = data;
    this.meta = meta;
    this.message = message;
  }
}
