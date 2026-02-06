// Client-side token management hook

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getTokenKey,
  getDefaultTokenData,
  resetTokensIfNewMonth,
  calculateRemainingTokens,
  type TokenData,
} from "./tokens";

export type TokenBalance = {
  tokensUsed: number;
  tokensRemaining: number;
  totalMonthlyTokens: number;
  currentMonth: string;
  isLoading: boolean;
  error?: string;
};

export function useTokenBalance(): TokenBalance {
  const { user } = useUser();
  const [balance, setBalance] = useState<TokenBalance>({
    tokensUsed: 0,
    tokensRemaining: 60,
    totalMonthlyTokens: 60,
    currentMonth: "",
    isLoading: true,
  });

  useEffect(() => {
    if (!user?.id) {
      setBalance((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchTokenBalance = () => {
      try {
        const tokenKey = getTokenKey(user.id);
        const stored = localStorage.getItem(tokenKey);
        let tokenData: TokenData = stored
          ? JSON.parse(stored)
          : getDefaultTokenData();

        // Reset tokens if it's a new month
        const resetData = resetTokensIfNewMonth(tokenData);

        // Save back if reset occurred
        if (resetData.tokenMonth !== tokenData.tokenMonth) {
          localStorage.setItem(tokenKey, JSON.stringify(resetData));
        }

        const remainingTokens = calculateRemainingTokens(resetData);

        setBalance({
          tokensUsed: resetData.tokensUsedThisMonth,
          tokensRemaining: remainingTokens,
          totalMonthlyTokens: resetData.totalMonthlyTokens,
          currentMonth: resetData.tokenMonth,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching token balance:", error);
        setBalance((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load token balance",
        }));
      }
    };

    fetchTokenBalance();
  }, [user?.id]);

  return balance;
}
