import { init } from "@instantdb/admin";
import schema, { AppSchema } from "../../instant.schema";

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "1b7923fa-1971-4710-8c06-e523887b5edb";
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN || "cf6412f5-069d-44c5-8ce4-0753c72a8d6e";

export const adminDb = init<AppSchema>({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN,
  schema,
});
