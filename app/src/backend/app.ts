import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthRoute } from "./routes/health";
import { obligationsRoute } from "./routes/obligations";
import { paymentCalendarRoute } from "./routes/payment-calendar";

export const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: "*"
  })
);

app.route("/api/health", healthRoute);
app.route("/api/obligations", obligationsRoute);
app.route("/api/payment-calendar", paymentCalendarRoute);
