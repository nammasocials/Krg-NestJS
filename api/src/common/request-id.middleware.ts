import { randomUUID } from "node:crypto";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";
/** A caller-supplied id is only trusted when it is short and plain; otherwise a new one is made. */
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

type WithId = Request & { id?: unknown };

/** The id of this request: from `X-Request-Id` when it looks safe, else generated. Stable per request. */
export function resolveRequestId(req: Request, res?: Response): string {
  const r = req as WithId;
  if (typeof r.id === "string" && r.id) return r.id;
  const header = req.headers[REQUEST_ID_HEADER];
  const sent = Array.isArray(header) ? header[0] : header;
  const id = sent && SAFE_ID.test(sent) ? sent : randomUUID();
  r.id = id;
  res?.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  resolveRequestId(req, res);
  next();
}

/** `@RequestId()` gives a controller method the id of the current request. */
export const RequestId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string =>
  resolveRequestId(ctx.switchToHttp().getRequest<Request>()),
);
