import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env.local" });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  BANK_PROVIDER: z.enum(["mock", "http_json"]).optional(),
  BANK_API_BASE_URL: z.string().url().optional(),
  BANK_API_TOKEN: z.string().optional(),
  BANK_BALANCES_PATH: z.string().default("/balances"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_MINI_APP_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);

export function isSupabaseConfigured() {
  return Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
}
