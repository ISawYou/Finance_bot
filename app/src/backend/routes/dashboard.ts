import { Hono } from "hono";
import { dashboardService } from "../services/dashboard-service";

export const dashboardRoute = new Hono().get("/owner", async (c) => {
  const overview = await dashboardService.getOwnerOverview();
  return c.json(overview);
});
