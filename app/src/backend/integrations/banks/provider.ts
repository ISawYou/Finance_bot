import { env } from "../../config/env";
import { httpJsonBankProvider } from "./http-json-bank-provider";
import { mockBankProvider } from "./mock-bank-provider";

export function resolveBankProvider() {
  if (env.BANK_PROVIDER === "http_json") {
    return httpJsonBankProvider;
  }

  return mockBankProvider;
}
