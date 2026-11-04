import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import type { Env } from "../config/env.schema";
import { dbNameFromUri } from "./db-uri";
import { runMigrations } from "./migrations";

export const DB_URI = Symbol("DB_URI");

export interface DbStatus {
  mode: "mock" | "real";
  connected: boolean;
  transactions: boolean;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private transactions = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService<Env, true>,
    @Inject(DB_URI) private readonly uri: string,
  ) {}

  get mode() {
    return this.config.get("DB_MODE", { infer: true });
  }

  async onModuleInit() {
    await this.assertTransactionSupport();
    if (this.mode === "mock") {
      await runMigrations(this.uri, dbNameFromUri(this.uri));
    } else {
      this.logger.log("DB_MODE=real: run pending migrations with `pnpm --filter api db:migrate`.");
    }
  }

  /** Multi-document transactions (invoices, stock) need a replica set; a standalone node cannot do them. */
  private async assertTransactionSupport() {
    const hello = await this.connection.getClient().db("admin").command({ hello: 1 });
    this.transactions = typeof hello.setName === "string";
    if (!this.transactions) {
      throw new Error(
        "MongoDB is running as a standalone server. Transactions need a replica set: start it with --replSet (see docs/02-tech-stack.md §3.4).",
      );
    }
    this.logger.log(`Connected (${this.mode} mode, replica set "${hello.setName}", transactions available)`);
  }

  status(): DbStatus {
    return {
      mode: this.mode,
      connected: this.connection.readyState === 1,
      transactions: this.transactions,
    };
  }
}
