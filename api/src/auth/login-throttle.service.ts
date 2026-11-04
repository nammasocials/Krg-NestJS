import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.schema";

interface Bucket {
  count: number;
  resetAt: number; // epoch ms; a fixed window that starts at the first hit
}

export interface Decision {
  allowed: boolean;
  retryAfterSeconds: number;
}

const ALLOWED: Decision = { allowed: true, retryAfterSeconds: 0 };

/**
 * Slows down password guessing. Two independent limits, both kept in this process's memory
 * (one API instance; a shared store is a deployment task for E08):
 *  - per IP: how many login requests of any kind in a short window;
 *  - per username + IP: how many attempts in a longer window. A successful login clears them,
 *    so in practice this limits failed logins.
 * The failure key includes the IP, so someone elsewhere cannot lock a real user out.
 */
@Injectable()
export class LoginThrottleService implements OnModuleDestroy {
  private readonly ipHits = new Map<string, Bucket>();
  private readonly failures = new Map<string, Bucket>();
  private readonly sweeper: NodeJS.Timeout;

  private readonly ipLimit: number;
  private readonly ipWindowMs: number;
  private readonly failLimit: number;
  private readonly failWindowMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.ipLimit = config.get("LOGIN_IP_LIMIT", { infer: true });
    this.ipWindowMs = config.get("LOGIN_IP_WINDOW_SECONDS", { infer: true }) * 1000;
    this.failLimit = config.get("LOGIN_FAIL_LIMIT", { infer: true });
    this.failWindowMs = config.get("LOGIN_FAIL_WINDOW_SECONDS", { infer: true }) * 1000;

    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref(); // never keeps the process alive
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
  }

  /** Counts one login request from this IP and says whether it may proceed. */
  hitIp(ip: string, now = Date.now()): Decision {
    const bucket = this.freshBucket(this.ipHits, ip, this.ipWindowMs, now);
    bucket.count += 1;
    return bucket.count > this.ipLimit ? this.refuse(bucket, now) : ALLOWED;
  }

  /**
   * Reserves one login attempt for this username+IP before the password is checked, so a burst of
   * parallel guesses is counted as it arrives instead of after each slow hash finishes.
   * Refused once the limit of unsuccessful attempts is used up; a success gives them all back.
   */
  tryAttempt(username: string, ip: string, now = Date.now()): Decision {
    const bucket = this.freshBucket(this.failures, this.failureKey(username, ip), this.failWindowMs, now);
    if (bucket.count >= this.failLimit) return this.refuse(bucket, now);
    bucket.count += 1;
    return ALLOWED;
  }

  recordSuccess(username: string, ip: string): void {
    this.failures.delete(this.failureKey(username, ip));
  }

  /** Drops expired entries so memory stays proportional to recent activity. */
  sweep(now = Date.now()): void {
    for (const map of [this.ipHits, this.failures]) {
      for (const [key, bucket] of map) if (now >= bucket.resetAt) map.delete(key);
    }
  }

  /** Number of tracked entries (tests and diagnostics). */
  size(): number {
    return this.ipHits.size + this.failures.size;
  }

  private failureKey(username: string, ip: string): string {
    return `${username.trim().toLowerCase()}|${ip}`;
  }

  /** The live bucket for a key, or a new one when none exists or its window has ended. */
  private freshBucket(map: Map<string, Bucket>, key: string, windowMs: number, now: number): Bucket {
    let bucket = map.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      map.set(key, bucket);
    }
    return bucket;
  }

  private refuse(bucket: Bucket, now: number): Decision {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
}
