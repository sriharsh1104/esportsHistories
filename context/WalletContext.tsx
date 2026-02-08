import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const WALLET_KEY = '@esports_wallet_balance';

type WalletContextType = {
  balance: number;
  topUp: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  isLoading: boolean;
};

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(WALLET_KEY);
        if (stored) setBalance(parseFloat(stored) || 0);
      } catch {
        setBalance(0);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistBalance = useCallback(async (val: number) => {
    await AsyncStorage.setItem(WALLET_KEY, String(val));
  }, []);

  const topUp = useCallback(
    async (amount: number) => {
      if (amount <= 0) return;
      const newBalance = balance + amount;
      setBalance(newBalance);
      await persistBalance(newBalance);
    },
    [balance, persistBalance]
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (amount <= 0) return;
      if (amount > balance) throw new Error('Insufficient balance');
      const newBalance = balance - amount;
      setBalance(newBalance);
      await persistBalance(newBalance);
    },
    [balance, persistBalance]
  );

  return (
    <WalletContext.Provider value={{ balance, topUp, withdraw, isLoading }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
