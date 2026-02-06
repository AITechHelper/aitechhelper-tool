// Token management utilities for user token tracking

export const TOKENS_PER_MONTH = 60;

export type TokenData = {
  tokensUsedThisMonth: number;
  tokenMonth: string; // Format: "2026-02"
  totalMonthlyTokens: number;
};

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getTokenKey(userId: string): string {
  return `tokens:${userId}`;
}

export function getDefaultTokenData(): TokenData {
  return {
    tokensUsedThisMonth: 0,
    tokenMonth: getCurrentMonth(),
    totalMonthlyTokens: TOKENS_PER_MONTH,
  };
}

export function resetTokensIfNewMonth(tokenData: TokenData): TokenData {
  const currentMonth = getCurrentMonth();
  
  if (tokenData.tokenMonth !== currentMonth) {
    return {
      tokensUsedThisMonth: 0,
      tokenMonth: currentMonth,
      totalMonthlyTokens: TOKENS_PER_MONTH,
    };
  }
  
  return tokenData;
}

export function calculateRemainingTokens(tokenData: TokenData): number {
  const resetData = resetTokensIfNewMonth(tokenData);
  return resetData.totalMonthlyTokens - resetData.tokensUsedThisMonth;
}

export function canUseToken(tokenData: TokenData): boolean {
  return calculateRemainingTokens(tokenData) > 0;
}

export function decrementToken(tokenData: TokenData): TokenData {
  const resetData = resetTokensIfNewMonth(tokenData);
  
  if (!canUseToken(resetData)) {
    return resetData; // Don't decrement if no tokens left
  }
  
  return {
    ...resetData,
    tokensUsedThisMonth: resetData.tokensUsedThisMonth + 1,
  };
}