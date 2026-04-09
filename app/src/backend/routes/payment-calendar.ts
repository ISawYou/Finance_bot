import { Hono } from "hono";
import { paymentCalendarService } from "../services/payment-calendar-service";

export const paymentCalendarRoute = new Hono().get("/overview", async (c) => {
  const overview = await paymentCalendarService.getOverview();
  return c.json(overview);
});
