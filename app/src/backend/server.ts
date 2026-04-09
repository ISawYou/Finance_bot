import { serve } from "@hono/node-server";
import { env } from "./config/env";
import { app } from "./app";

serve(
  {
    fetch: app.fetch,
    port: env.API_PORT
  },
  (info) => {
    console.log(`Finance Control API listening on http://localhost:${info.port}`);
  }
);
