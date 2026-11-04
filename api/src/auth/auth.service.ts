import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Role } from "../users/roles";
import type { UserDocument } from "../users/user.schema";
import { UsersService } from "../users/users.service";
import type { LoginDto } from "./dto/login.dto";
import { AUTH_REQUIRED } from "./jwt-auth.guard";
import { LoginThrottleService } from "./login-throttle.service";
import { PasswordService } from "./password.service";
import { type ClientMeta, type IssuedRefreshToken, TokenService } from "./token.service";

export const INVALID_CREDENTIALS = "Invalid username or password";
export const INVALID_SESSION = "Session expired. Please sign in again.";

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
  refresh: IssuedRefreshToken;
}

@Injectable()
export class AuthService {
  /** Verified against when the username is unknown, so unknown and wrong-password cost the same time. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async login(dto: LoginDto, meta: ClientMeta): Promise<LoginResult> {
    const ip = meta.ip ?? "unknown";
    const user = await this.users.findByUsername(dto.username, true);

    // One failure path for unknown user, wrong password and inactive account: no user enumeration.
    const stored = user?.passwordHash ?? (await this.getDummyHash());
    const result = await this.passwords.verify(dto.password, stored);
    if (!user || !result.valid || !user.isActive) throw new UnauthorizedException(INVALID_CREDENTIALS);
    this.throttle.recordSuccess(dto.username, ip);

    const upgradedHash = result.needsRehash ? await this.passwords.hash(dto.password) : undefined;
    await this.users.recordLogin(user.id, upgradedHash);

    const refresh = await this.tokens.issueRefreshToken(user._id, meta);
    return this.startSession(user, refresh);
  }

  /**
   * Rotation: the presented token is revoked and replaced in the same family.
   * A token that was already revoked is a replay (possible theft): the whole family is revoked.
   */
  async refresh(raw: string | undefined, meta: ClientMeta): Promise<LoginResult> {
    if (!raw) throw new UnauthorizedException(INVALID_SESSION);

    const used = await this.tokens.consumeActive(raw);
    if (!used) {
      const known = await this.tokens.findByRaw(raw);
      if (known?.revokedAt) await this.tokens.revokeFamily(known.familyId);
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const user = await this.users.findById(used.userId.toString());
    if (!user || !user.isActive) {
      await this.tokens.revokeFamily(used.familyId);
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const refresh = await this.tokens.issueRefreshToken(user._id, meta, used.familyId);
    await this.tokens.linkReplacement(used._id, refresh.id);
    return this.startSession(user, refresh);
  }

  /** Fresh from the database: a valid token for a user who was deactivated or deleted is still refused. */
  async me(userId: string): Promise<SessionUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException(AUTH_REQUIRED);
    return { id: user.id, username: user.username, fullName: user.fullName, role: user.role };
  }

  /** Ends the session on this device. Never fails: an unknown or missing token is simply already signed out. */
  async logout(raw: string | undefined): Promise<void> {
    if (!raw) return;
    const known = await this.tokens.findByRaw(raw);
    if (known) await this.tokens.revokeFamily(known.familyId);
  }

  private async startSession(user: UserDocument, refresh: IssuedRefreshToken): Promise<LoginResult> {
    const access = await this.tokens.issueAccessToken({ id: user.id, role: user.role });
    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
      refresh,
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwords.hash(randomBytes(16).toString("hex"));
    return this.dummyHash;
  }
}
