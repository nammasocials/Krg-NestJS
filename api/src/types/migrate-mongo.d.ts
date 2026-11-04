// migrate-mongo ships no types; only the parts the app uses are declared.
declare module "migrate-mongo" {
  import type { Db, MongoClient } from "mongodb";

  export const config: { set(content: Record<string, unknown>): void };
  export const database: { connect(): Promise<{ db: Db; client: MongoClient }> };
  export function up(db: Db, client: MongoClient): Promise<string[]>;
}
