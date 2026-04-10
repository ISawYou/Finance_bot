import type { BankBalancesProvider, ExternalBankBalance } from "./types";

const mockBalances: ExternalBankBalance[] = [
  {
    externalAccountId: "mock-checking-main",
    bankName: "T-Bank",
    accountName: "Main operating account",
    accountNumberMask: "**** 1042",
    currency: "RUB",
    amount: 1850000,
    balanceAt: new Date().toISOString()
  },
  {
    externalAccountId: "mock-reserve",
    bankName: "Alfa-Bank",
    accountName: "Reserve account",
    accountNumberMask: "**** 8821",
    currency: "RUB",
    amount: 740000,
    balanceAt: new Date().toISOString()
  }
];

export const mockBankProvider: BankBalancesProvider = {
  provider: "mock",
  async fetchBalances() {
    return mockBalances;
  }
};
