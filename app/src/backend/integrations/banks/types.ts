import type { BankProvider } from "@shared/types/domain";

export type ExternalBankBalance = {
  externalAccountId: string;
  bankName: string;
  accountName: string;
  accountNumberMask: string | null;
  currency: string;
  amount: number;
  balanceAt: string;
};

export type BankBalancesProvider = {
  provider: BankProvider;
  fetchBalances(): Promise<ExternalBankBalance[]>;
};
