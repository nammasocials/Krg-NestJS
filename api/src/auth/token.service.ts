import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Model, Types } from "mongoose";
import type { Env } from "../config/env.schema";
import type { Role } from "../users/roles";
import { RefreshToken } from "./refresh-token.schema";
import { ttlToSeconds } from "./ttl";

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export interface IssuedRefreshToken {
  id: Types.ObjectId;
  /** The opaque value for the cookie. It exists only here: the database keeps just its SHA-256. */
  raw: string;
  familyId: string;
  expiresAt: Date;
  maxAgeMs: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    @InjectModel(RefreshToken.name) private readonly refreshTokens: Model<RefreshToken>,
  ) {}

  static hash(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  async issueAccessToken(user: { id: string; role: Role }): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = ttlToSeconds(this.config.get("JWT_ACCESS_TTL", { infer: true }));
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role }, { expiresIn });
    return { token, expiresIn };
  }

  /** A new family starts at login; refresh passes the existing family to continue the chain. */
  async issueRefreshToken(
    userId: Types.ObjectId | string,
    meta: ClientMeta,
    familyId: string = randomUUID(),
  ): Promise<IssuedRefreshToken> {
    const raw = randomBytes(32).toString("base64url"); // 256 bits
    const maxAgeMs = this.config.get("REFRESH_TTL_DAYS", { infer: true }) * 86_400_000;
    const expiresAt = new Date(Date.now() + maxAgeMs);

    const row = await this.refreshTokens.create({
      userId,
      tokenHash: TokenService.hash(raw),
      familyId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
    });
    return { id: row._id, raw, familyId, expiresAt, maxAgeMs };
  }

  /**
   * Atomically revokes a token that is still usable (not revoked, not expired) and returns it.
   * Two simultaneous calls with the same value: the database lets exactly one of them match.
   */
  consumeActive(raw: string): Promise<{ _id: Types.ObjectId; userId: Types.ObjectId; familyId: string } | null> {
    const now = new Date();
    return this.refreshTokens
      .findOneAndUpdate(
        { tokenHash: TokenService.hash(raw), revokedAt: null, expiresAt: { $gt: now } },
        { $set: { revokedAt: now } },
        { projection: { userId: 1, familyId: 1 } },
      )
      .lean()
      .exec();
  }

  /** The stored row for a token value, whatever its state (used to tell reuse from unknown). */
  findByRaw(raw: string) {
    return this.refreshTokens.findOne({ tokenHash: TokenService.hash(raw) }, { familyId: 1, revokedAt: 1 }).lean().exec();
  }

  async linkReplacement(oldId: Types.ObjectId, newId: Types.ObjectId): Promise<void> {
    await this.refreshTokens.updateOne({ _id: oldId }, { $set: { replacedBy: newId } }).exec();
  }

  /** Revokes every still-active token of a family (reuse detected, logout, or deactivated user). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokens
      .updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: new Date() } })
      .exec();
  }
}
