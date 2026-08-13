import { init } from "@instantdb/react";
import schema, { AppSchema } from "../../instant.schema";

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID || "1b7923fa-1971-4710-8c06-e523887b5edb";

export const db = init<AppSchema>({
  appId: APP_ID,
  schema,
});
