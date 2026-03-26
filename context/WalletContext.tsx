import * as walletService from '@/services/wallet.service';
import { Transaction, TransactionFilters } from '@/types/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

type WalletContextType = {
  balance: number;
  topUp: (amount: number) => Promise<void>;
  withdraw: (amount: number, upiId: string) => Promise<void>;
  refreshWallet: () => Promise<void>;
  transactions: Transaction[];
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  isLoading: boolean;
};

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await walletService.fetchWalletBalance();
      setBalance(data.walletBalance);
    } catch (error) {
      console.error('Wallet fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchTransactions = useCallback(async (filters?: TransactionFilters) => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await walletService.fetchWalletTopupHistory(filters);
      setTransactions(data);
    } catch (error) {
      console.error('Transactions fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Keep drawer balance accurate: sync from profile when present, otherwise fetch once.
  useEffect(() => {
    if (!isAuthenticated) {
      setBalance(0);
      setTransactions([]);
      return;
    }

    const wb = Number((user as { walletBalance?: unknown } | null)?.walletBalance);
    if (Number.isFinite(wb)) {
      setBalance(wb);
      return;
    }

    // Profile didn't include wallet balance; fetch it once.
    void fetchWallet();
  }, [isAuthenticated, user?.walletBalance, fetchWallet]);

  const topUp = useCallback(
    async (amount: number) => {
      if (amount <= 0) return;
      try {
        const res = await walletService.legacyWalletTopUp(amount);
        setBalance(res.walletBalance);
        await fetchTransactions(); // Refresh history
      } catch (error) {
        throw error;
      }
    },
    [fetchTransactions]
  );

  const withdraw = useCallback(
    async (amount: number, upiId: string) => {
      if (amount <= 0) return;
      if (amount > balance) throw new Error('Insufficient balance');
      try {
        const res = await walletService.requestWalletWithdraw(amount, upiId);
        setBalance(res.walletBalance);
        await fetchTransactions(); // Refresh history
      } catch (error) {
        throw error;
      }
    },
    [balance, fetchTransactions]
  );

  return (
    <WalletContext.Provider 
      value={{ 
        balance, 
        topUp, 
        withdraw, 
        refreshWallet: fetchWallet, 
        transactions,
        fetchTransactions,
        isLoading 
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
