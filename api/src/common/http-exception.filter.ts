import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

const CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "TOO_MANY_ATTEMPTS",
};

/** Turns every error into `{ code, message, data }`; stack traces never reach the client. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", data: null });
    }

    const status = exception.getStatus();
    const body = exception.getResponse();
    let message = exception.message;
    let data: unknown = null;
    let code = CODES[status] ?? "ERROR";

    if (typeof body === "object" && body !== null) {
      const b = body as { message?: string | string[]; code?: string };
      if (b.code) code = b.code;
      if (Array.isArray(b.message)) {
        message = "Validation failed";
        data = { errors: b.message };
        code = "VALIDATION_FAILED";
      } else if (typeof b.message === "string") {
        message = b.message;
      }
    }

    return res.status(status).json({ code, message, data });
  }
}
