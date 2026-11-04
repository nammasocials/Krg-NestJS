import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

type ReplSet = { getUri(db?: string): string; stop(): Promise<unknown> };

/**
 * Runs a throw-away single-node MongoDB replica set inside this process (DB_MODE=mock).
 * `mongodb-memory-server` is a devDependency, so it is loaded lazily and only in mock mode.
 */
@Injectable()
export class MockMongoService implements OnApplicationShutdown {
  private readonly logger = new Logger(MockMongoService.name);
  private server?: ReplSet;
  private starting?: Promise<string>;

  /** Starts the server once (later calls return the same URI). `dbPath` empty = in-memory, else persistent. */
  start(dbPath: string, port: number, version?: string): Promise<string> {
    this.starting ??= this.boot(dbPath, port, version);
    return this.starting;
  }

  private async boot(dbPath: string, port: number, version?: string): Promise<string> {
    let mod: typeof import("mongodb-memory-server");
    try {
      mod = await import("mongodb-memory-server");
    } catch {
      throw new Error(
        "DB_MODE=mock needs the dev dependency 'mongodb-memory-server'. Install dev dependencies or set DB_MODE=real.",
      );
    }

    const persistent = dbPath.trim() !== "";
    const dir = persistent ? resolve(process.cwd(), dbPath) : undefined;
    if (dir) await mkdir(dir, { recursive: true });

    this.logger.log(
      `Starting mock MongoDB replica set (${dir ? `data in ${dir}` : "in-memory"}). The first run downloads the MongoDB binary.`,
    );
    this.server = await mod.MongoMemoryReplSet.create({
      binary: version ? { version } : undefined,
      replSet: { count: 1, storageEngine: "wiredTiger" }, // without a dbPath the library uses a temp folder it deletes on stop
      // Persistent data remembers the replica-set member address, so the port must be the same on every start.
      instanceOpts: dir ? [{ dbPath: dir, storageEngine: "wiredTiger", port }] : [],
    });
    return this.server.getUri();
  }

  async onApplicationShutdown() {
    await this.server?.stop();
    this.server = undefined;
    this.starting = undefined;
  }
}
