import type { PostgrestError } from "@supabase/supabase-js";
import type { BankAccount, BankProvider, BankSyncLog, CurrentBalance } from "@shared/types/domain";
import { createServerSupabaseClient } from "../lib/supabase";
import type { ExternalBankBalance } from "../integrations/banks/types";

type BankAccountRow = {
  id: string;
  provider: BankProvider;
  external_account_id: string;
  bank_name: string | null;
  account_name: string | null;
  account_number_mask: string | null;
  currency: string | null;
  is_active: boolean | null;
  last_synced_at: string | null;
};

type CurrentBalanceRow = {
  bank_account_id: string;
  amount: number;
  currency: string | null;
  balance_at: string;
  source: "bank_api" | "cache" | "mock" | null;
  bank_accounts:
    | {
        provider: BankProvider;
        bank_name: string | null;
        account_name: string | null;
        account_number_mask: string | null;
      }
    | Array<{
        provider: BankProvider;
        bank_name: string | null;
        account_name: string | null;
        account_number_mask: string | null;
      }>
    | null;
};

type SyncLogRow = {
  id: string;
  provider: BankProvider;
  sync_type: "balances";
  status: "success" | "failed";
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  accounts_synced: number | null;
};

export const bankBalancesRepository = {
  async upsertBalances(provider: BankProvider, items: ExternalBankBalance[]) {
    const supabase = createServerSupabaseClient();
    if (!supabase || items.length === 0) {
      return [];
    }

    const accountRows = items.map((item) => ({
      provider,
      external_account_id: item.externalAccountId,
      bank_name: item.bankName,
      account_name: item.accountName,
      account_number_mask: item.accountNumberMask,
      currency: item.currency,
      is_active: true,
      last_synced_at: item.balanceAt
    }));

    const { data: accounts, error: accountError } = await supabase
      .from("bank_accounts")
      .upsert(accountRows, { onConflict: "provider,external_account_id" })
      .select(
        `
          id,
          provider,
          external_account_id,
          bank_name,
          account_name,
          account_number_mask,
          currency,
          is_active,
          last_synced_at
        `
      );

    if (accountError) {
      throw createRepositoryError(accountError);
    }

    const accountMap = new Map(
      ((accounts ?? []) as BankAccountRow[]).map((row) => [row.external_account_id, row] as const)
    );

    const balanceRows = items
      .map((item) => {
        const account = accountMap.get(item.externalAccountId);
        if (!account) {
          return null;
        }

        return {
          bank_account_id: account.id,
          amount: item.amount,
          currency: item.currency,
          balance_at: item.balanceAt,
          source: "bank_api" as const
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const { error: balancesError } = await supabase
      .from("current_balances")
      .upsert(balanceRows, { onConflict: "bank_account_id" });

    if (balancesError) {
      throw createRepositoryError(balancesError);
    }

    return balanceRows.map((row) => {
      const account = Array.from(accountMap.values()).find((value) => value.id === row.bank_account_id);
      return mapCurrentBalanceRow({
        bank_account_id: row.bank_account_id,
        amount: row.amount,
        currency: row.currency,
        balance_at: row.balance_at,
        source: row.source,
        bank_accounts: account
          ? {
              provider: account.provider,
              bank_name: account.bank_name,
              account_name: account.account_name,
              account_number_mask: account.account_number_mask
            }
          : null
      });
    });
  },

  async listLatestBalances(): Promise<CurrentBalance[]> {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("current_balances")
      .select(
        `
          bank_account_id,
          amount,
          currency,
          balance_at,
          source,
          bank_accounts!inner (
            provider,
            bank_name,
            account_name,
            account_number_mask
          )
        `
      )
      .order("balance_at", { ascending: false });

    if (error) {
      throw createRepositoryError(error);
    }

    return ((data ?? []) as unknown as CurrentBalanceRow[]).map(mapCurrentBalanceRow);
  },

  async listBankAccounts(): Promise<BankAccount[]> {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("bank_accounts")
      .select(
        `
          id,
          provider,
          external_account_id,
          bank_name,
          account_name,
          account_number_mask,
          currency,
          is_active,
          last_synced_at
        `
      )
      .eq("is_active", true)
      .order("bank_name", { ascending: true });

    if (error) {
      throw createRepositoryError(error);
    }

    return ((data ?? []) as BankAccountRow[]).map(mapBankAccountRow);
  },

  async createSyncLog(entry: Omit<BankSyncLog, "id">) {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("bank_sync_logs")
      .insert({
        provider: entry.provider,
        sync_type: entry.syncType,
        status: entry.status,
        started_at: entry.startedAt,
        finished_at: entry.finishedAt,
        error_message: entry.errorMessage,
        accounts_synced: entry.accountsSynced
      })
      .select(
        `
          id,
          provider,
          sync_type,
          status,
          started_at,
          finished_at,
          error_message,
          accounts_synced
        `
      )
      .single();

    if (error) {
      throw createRepositoryError(error);
    }

    return mapSyncLogRow(data as SyncLogRow);
  }
};

function mapBankAccountRow(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    provider: row.provider,
    externalAccountId: row.external_account_id,
    bankName: row.bank_name ?? "Bank",
    accountName: row.account_name ?? "Account",
    accountNumberMask: row.account_number_mask,
    currency: row.currency ?? "RUB",
    isActive: row.is_active ?? true,
    lastSyncedAt: row.last_synced_at
  };
}

function mapCurrentBalanceRow(row: CurrentBalanceRow): CurrentBalance {
  const account = Array.isArray(row.bank_accounts) ? row.bank_accounts[0] ?? null : row.bank_accounts;

  return {
    bankAccountId: row.bank_account_id,
    provider: account?.provider ?? "mock",
    bankName: account?.bank_name ?? "Bank",
    accountName: account?.account_name ?? "Account",
    accountNumberMask: account?.account_number_mask ?? null,
    currency: row.currency ?? "RUB",
    amount: row.amount,
    balanceAt: row.balance_at,
    source: row.source ?? "cache"
  };
}

function mapSyncLogRow(row: SyncLogRow): BankSyncLog {
  return {
    id: row.id,
    provider: row.provider,
    syncType: row.sync_type,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    errorMessage: row.error_message,
    accountsSynced: row.accounts_synced ?? 0
  };
}

function createRepositoryError(error: PostgrestError) {
  return new Error(`Supabase query failed: ${error.message}`);
}
