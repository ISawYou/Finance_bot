import { Hono } from "hono";
import { createObligationInputSchema } from "@shared/schemas/obligation";
import { obligationsService } from "../services/obligations-service";

export const obligationsRoute = new Hono()
  .get("/", async (c) => {
    const obligations = await obligationsService.list();
    return c.json(obligations);
  })
  .post("/", async (c) => {
    const body = await c.req.json();
    const parsed = createObligationInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten()
        },
        400
      );
    }

    try {
      const obligation = await obligationsService.create(parsed.data);
      return c.json(obligation, 201);
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to create obligation"
        },
        500
      );
    }
  });
