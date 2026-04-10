import { Hono } from "hono";
import { bankBalancesService } from "../services/bank-balances-service";

export const bankRoute = new Hono().get("/balances", async (c) => {
  const balances = await bankBalancesService.getBalances();
  return c.json(balances);
});
