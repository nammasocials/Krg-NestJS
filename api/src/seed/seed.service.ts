import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { PasswordService } from "../auth/password.service";
import type { Env } from "../config/env.schema";
import { UsersService } from "../users/users.service";

export type SeedResult = { created: false } | { created: true; username: string; generatedPassword?: string };

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Mock mode seeds on every start; real mode only through `pnpm db:seed`. */
  async onApplicationBootstrap() {
    if (this.config.get("DB_MODE", { infer: true }) === "mock") await this.run();
  }

  /** Creates the first admin when there are no users at all. Safe to call repeatedly. */
  async run(): Promise<SeedResult> {
    if ((await this.users.count()) > 0) {
      this.logger.log("Users already exist: admin seed skipped");
      return { created: false };
    }

    const username = this.config.get("SEED_ADMIN_USERNAME", { infer: true });
    const configured = this.config.get("SEED_ADMIN_PASSWORD", { infer: true });
    const password = configured ?? randomBytes(12).toString("base64url");

    try {
      await this.users.create({
        username,
        passwordHash: await this.passwords.hash(password),
        fullName: this.config.get("SEED_ADMIN_FULL_NAME", { infer: true }),
        role: "SUPER_ADMIN",
      });
    } catch (err) {
      // Another instance seeded at the same moment: the unique username index stops the second insert.
      if ((err as { code?: number }).code === 11000) return { created: false };
      throw err;
    }

    this.logger.log(`Created first admin "${username}" (SUPER_ADMIN)`);
    if (configured) return { created: true, username };

    this.announce(username, password);
    return { created: true, username, generatedPassword: password };
  }

  /** Written straight to stdout (not through the logger) so it is shown once and never lands in log files. */
  private announce(username: string, password: string) {
    process.stdout.write(
      [
        "",
        "================================================================",
        " First admin created. This password is shown ONCE; save it now.",
        `   username: ${username}`,
        `   password: ${password}`,
        " Set SEED_ADMIN_PASSWORD before the first start to choose your own.",
        "================================================================",
        "",
        "",
      ].join("\n"),
    );
  }
}
