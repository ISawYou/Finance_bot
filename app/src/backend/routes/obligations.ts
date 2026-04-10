import { Hono } from "hono";
import {
  createObligationInputSchema,
  updateObligationInputSchema,
  updateObligationStatusInputSchema
} from "@shared/schemas/obligation";
import { obligationsService } from "../services/obligations-service";

export const obligationsRoute = new Hono()
  .get("/", async (c) => {
    const obligations = await obligationsService.list();
    return c.json(obligations);
  })
  .get("/:id", async (c) => {
    try {
      const details = await obligationsService.getDetails(c.req.param("id"));
      return c.json(details);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load obligation.";
      const status = message === "Obligation not found." ? 404 : 500;
      return c.json({ error: message }, status);
    }
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
  })
  .patch("/:id", async (c) => {
    const body = await c.req.json();
    const parsed = updateObligationInputSchema.safeParse(body);

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
      const obligation = await obligationsService.update(c.req.param("id"), parsed.data);
      return c.json(obligation);
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to update obligation"
        },
        500
      );
    }
  })
  .patch("/:id/status", async (c) => {
    const body = await c.req.json();
    const parsed = updateObligationStatusInputSchema.safeParse(body);

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
      const obligation = await obligationsService.setStatus(c.req.param("id"), parsed.data.status);
      return c.json(obligation);
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : "Failed to update obligation status"
        },
        500
      );
    }
  });
