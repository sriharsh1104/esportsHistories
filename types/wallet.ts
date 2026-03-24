/** GET `/wallet/balance` — amounts may be nested under `data`. */
export type WalletWithdrawLimits = {
  minWithdraw?: number;
  maxWithdraw?: number;
  dailyLimit?: number;
  dailyRemaining?: number;
};

export type WalletBalanceResult = {
  walletBalance: number;
  withdrawalLimits?: WalletWithdrawLimits;
};

/** Admin POST `/wallet/add-balance`. */
export type WalletAddBalanceBody = {
  userId: string;
  amount: number;
  reason?: string;
};

/** Admin POST `/wallet/add-balance-bulk` — body shape varies by server; send `items` or override in caller. */
export type WalletAddBalanceBulkRow = {
  userId: string;
  amount: number;
  reason?: string;
};
