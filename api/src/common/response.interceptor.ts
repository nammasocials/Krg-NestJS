import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from "@nestjs/common";
import { Observable, map } from "rxjs";

export interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T | null;
}

/** Wraps every successful response in `{ code, message, data }`. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T> | T> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T> | T> {
    return next.handle().pipe(
      map((data) =>
        data instanceof StreamableFile
          ? data
          : { code: "OK", message: "Success", data: data ?? null },
      ),
    );
  }
}
