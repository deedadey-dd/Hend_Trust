/**
 * Client-side storage helper for managing buyer review tokens.
 * These tokens allow buyers to view and edit their submitted reviews
 * without incurring SMS OTP costs or allowing sellers to impersonate buyers.
 */

const STORAGE_PREFIX = 'hendaxis_review_token_';

export function saveReviewToken(paystackRef: string, token: string): void {
  if (!paystackRef || !token) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${paystackRef.trim()}`, token.trim());
  } catch (err) {
    console.error('Failed to save review token to localStorage:', err);
  }
}

export function getReviewToken(paystackRef: string): string | null {
  if (!paystackRef) return null;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${paystackRef.trim()}`);
  } catch {
    return null;
  }
}
