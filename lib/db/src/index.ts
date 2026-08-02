import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "";

export const isDatabaseConfigured = Boolean(connectionString);
export const pool = connectionString ? new Pool({ connectionString }) : null;
export const db = pool ? drizzle(pool, { schema }) : null;

export const isDatabaseAvailable = () => Boolean(db && pool);

export * from "./schema";
