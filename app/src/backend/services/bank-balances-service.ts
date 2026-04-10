import type { BankBalancesResponse, BankSyncLog, CurrentBalance } from "@shared/types/domain";
import { isSupabaseConfigured } from "../config/env";
import { resolveBankProvider } from "../integrations/banks/provider";
import { bankBalancesRepository } from "../repositories/bank-balances-repository";

const mockBalances: CurrentBalance[] = [
  {
    bankAccountId: "mock-checking-main",
    provider: "mock",
    bankName: "T-Bank",
    accountName: "Main operating account",
    accountNumberMask: "**** 1042",
    currency: "RUB",
    amount: 1850000,
    balanceAt: new Date().toISOString(),
    source: "mock"
  },
  {
    bankAccountId: "mock-reserve",
    provider: "mock",
    bankName: "Alfa-Bank",
    accountName: "Reserve account",
    accountNumberMask: "**** 8821",
    currency: "RUB",
    amount: 740000,
    balanceAt: new Date().toISOString(),
    source: "mock"
  }
];

export const bankBalancesService = {
  async getBalances(): Promise<BankBalancesResponse> {
    const provider = resolveBankProvider();
    const startedAt = new Date().toISOString();

    try {
      const externalBalances = await provider.fetchBalances();

      if (!externalBalances.length) {
        return buildResponse("mock", mockBalances);
      }

      if (!isSupabaseConfigured()) {
        return buildResponse(
          provider.provider === "mock" ? "mock" : "bank_api",
          mapDirectBalances(provider.provider, externalBalances)
        );
      }

      try {
        const saved = await bankBalancesRepository.upsertBalances(provider.provider, externalBalances);
        await writeSyncLog({
          provider: provider.provider,
          syncType: "balances",
          status: "success",
          startedAt,
          finishedAt: new Date().toISOString(),
          errorMessage: null,
          accountsSynced: saved.length
        });

        return buildResponse(provider.provider === "mock" ? "mock" : "bank_api", saved);
      } catch (persistError) {
        console.warn("Bank balances persist failed, returning direct API data.", persistError);
        return buildResponse(
          provider.provider === "mock" ? "mock" : "bank_api",
          mapDirectBalances(provider.provider, externalBalances)
        );
      }
    } catch (error) {
      console.warn("Bank balances sync failed, trying cache.", error);

      if (isSupabaseConfigured()) {
        try {
          const cached = await bankBalancesRepository.listLatestBalances();

          if (cached.length > 0) {
            await writeSyncLog({
              provider: provider.provider,
              syncType: "balances",
              status: "failed",
              startedAt,
              finishedAt: new Date().toISOString(),
              errorMessage: error instanceof Error ? error.message : "Sync failed",
              accountsSynced: cached.length
            });

            return buildResponse("cache", cached.map((item) => ({ ...item, source: "cache" })));
          }
        } catch (cacheError) {
          console.warn("Bank balances cache read failed.", cacheError);
        }
      }

      return buildResponse("mock", mockBalances);
    }
  }
};

function mapDirectBalances(
  provider: CurrentBalance["provider"],
  items: Array<{
    externalAccountId: string;
    bankName: string;
    accountName: string;
    accountNumberMask: string | null;
    currency: string;
    amount: number;
    balanceAt: string;
  }>
) {
  return items.map(
    (item): CurrentBalance => ({
      bankAccountId: item.externalAccountId,
      provider,
      bankName: item.bankName,
      accountName: item.accountName,
      accountNumberMask: item.accountNumberMask,
      currency: item.currency,
      amount: item.amount,
      balanceAt: item.balanceAt,
      source: provider === "mock" ? "mock" : "bank_api"
    })
  );
}

function buildResponse(source: BankBalancesResponse["source"], items: CurrentBalance[]): BankBalancesResponse {
  return {
    source,
    syncedAt: items[0]?.balanceAt ?? null,
    totalCash: items.reduce((total, item) => total + item.amount, 0),
    items
  };
}

async function writeSyncLog(entry: Omit<BankSyncLog, "id">) {
  try {
    await bankBalancesRepository.createSyncLog(entry);
  } catch (error) {
    console.warn("Bank sync log write failed.", error);
  }
}
