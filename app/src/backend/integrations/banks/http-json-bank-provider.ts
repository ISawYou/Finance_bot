import { env } from "../../config/env";
import type { BankBalancesProvider, ExternalBankBalance } from "./types";

type HttpJsonBalancesPayload = {
  accounts?: Array<{
    externalId?: string;
    bankName?: string;
    accountName?: string;
    accountNumberMask?: string | null;
    currency?: string;
    balance?: number;
    balanceAt?: string;
  }>;
};

export const httpJsonBankProvider: BankBalancesProvider = {
  provider: "http_json",
  async fetchBalances() {
    if (!env.BANK_API_BASE_URL || !env.BANK_API_TOKEN) {
      throw new Error("Bank API is not configured.");
    }

    const url = new URL(env.BANK_BALANCES_PATH, env.BANK_API_BASE_URL);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.BANK_API_TOKEN}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Bank API error: ${response.status}`);
    }

    const payload = (await response.json()) as HttpJsonBalancesPayload;
    const accounts = payload.accounts ?? [];

    return accounts.map((account, index): ExternalBankBalance => ({
      externalAccountId: account.externalId ?? `account-${index + 1}`,
      bankName: account.bankName ?? "Bank",
      accountName: account.accountName ?? `Account ${index + 1}`,
      accountNumberMask: account.accountNumberMask ?? null,
      currency: account.currency ?? "RUB",
      amount: Number(account.balance ?? 0),
      balanceAt: account.balanceAt ?? new Date().toISOString()
    }));
  }
};
