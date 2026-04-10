import { Hono } from "hono";
import { cors } from "hono/cors";
import { bankRoute } from "./routes/bank";
import { dashboardRoute } from "./routes/dashboard";
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
app.route("/api/bank", bankRoute);
app.route("/api/dashboard", dashboardRoute);
app.route("/api/obligations", obligationsRoute);
app.route("/api/payment-calendar", paymentCalendarRoute);
