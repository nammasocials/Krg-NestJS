import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { type Decision, LoginThrottleService } from "./login-throttle.service";

export const TOO_MANY_ATTEMPTS = "Too many attempts. Try again later.";

/**
 * Runs before body validation, so malformed requests count against the IP limit too, and a
 * username+IP that has used up its attempts is refused even when the password is right.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  constructor(private readonly throttle: LoginThrottleService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const ip = req.ip ?? "unknown";

    const byIp = this.throttle.hitIp(ip);
    if (!byIp.allowed) this.reject(res, byIp);

    const username = (req.body as { username?: unknown } | undefined)?.username;
    if (typeof username === "string") {
      const attempt = this.throttle.tryAttempt(username, ip);
      if (!attempt.allowed) this.reject(res, attempt);
    }
    return true;
  }

  private reject(res: Response, decision: Decision): never {
    res.setHeader("Retry-After", String(decision.retryAfterSeconds));
    throw new HttpException({ code: "TOO_MANY_ATTEMPTS", message: TOO_MANY_ATTEMPTS }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
