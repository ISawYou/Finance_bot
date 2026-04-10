import { Hono } from "hono";
import { paymentCalendarFiltersSchema } from "@shared/schemas/payment-calendar-filters";
import { paymentCalendarService } from "../services/payment-calendar-service";

export const paymentCalendarRoute = new Hono()
  .get("/overview", async (c) => {
    const overview = await paymentCalendarService.getOverview();
    return c.json(overview);
  })
  .get("/events", async (c) => {
    const parsed = paymentCalendarFiltersSchema.safeParse({
      dateFrom: c.req.query("dateFrom"),
      dateTo: c.req.query("dateTo"),
      status: c.req.query("status") ?? "all",
      flowType: c.req.query("flowType") ?? "all"
    });

    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten()
        },
        400
      );
    }

    const events = await paymentCalendarService.getEvents(parsed.data);
    return c.json(events);
  });
