import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import type { Env } from "../config/env.schema";
import type { AuthUser } from "./auth-user";
import { AuthService, type LoginResult } from "./auth.service";
import { CurrentUser, Public } from "./decorators";
import { LoginThrottleGuard } from "./login-throttle.guard";
import { LoginDto } from "./dto/login.dto";
import { REFRESH_COOKIE, clearRefreshCookieOptions, refreshCookieOptions } from "./refresh-cookie";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private get production() {
    return this.config.get("NODE_ENV", { infer: true }) === "production";
  }

  private meta(req: Request) {
    return { ip: req.ip, userAgent: req.get("user-agent") };
  }

  /** Sets the new refresh cookie and returns the part of the result that goes in the body. */
  private startSession(res: Response, { refresh, ...body }: LoginResult) {
    res.cookie(REFRESH_COOKIE, refresh.raw, refreshCookieOptions(this.production, refresh.maxAgeMs));
    return body;
  }

  @Public()
  @UseGuards(LoginThrottleGuard)
  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Sign in; returns an access token and sets the refresh cookie" })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.startSession(res, await this.auth.login(dto, this.meta(req)));
  }

  @Public() // authenticated by the refresh cookie, not by an access token
  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Rotate the refresh cookie and return a new access token" })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const raw = (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE];
      return this.startSession(res, await this.auth.refresh(raw, this.meta(req)));
    } catch (err) {
      if (err instanceof UnauthorizedException) res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions(this.production));
      throw err;
    }
  }

  @Public() // must work with an expired access token
  @Post("logout")
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke this device's refresh token and clear the cookie" })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE];
    await this.auth.logout(raw);
    res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions(this.production));
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "The signed-in user, checked against the database" })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
