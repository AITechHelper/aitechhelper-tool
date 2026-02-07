import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export type TokenBalance = {
  tokensUsed: number;
  tokensRemaining: number;
  totalMonthlyTokens: number;
  isLoading: boolean;
  error?: string;
};

export function useTokenBalance(): TokenBalance {
  const { user } = useUser();
  const [balance, setBalance] = useState<TokenBalance>({
    tokensUsed: 0,
    tokensRemaining: 60,
    totalMonthlyTokens: 60,
    isLoading: true,
  });

  useEffect(() => {
    if (!user?.id) {
      setBalance((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    async function fetchTokenBalance() {
      try {
        const res = await fetch("/api/tokens");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setBalance({
          tokensUsed: data.tokensUsed,
          tokensRemaining: data.tokensRemaining,
          totalMonthlyTokens: data.totalMonthlyTokens,
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
    }

    fetchTokenBalance();
  }, [user?.id]);

  return balance;
}
