import type { Lang } from '../roast/engine';

export interface Settings { income: number; salaryDay: number; roastLanguage: Lang; onboardingDone: boolean }
export interface Category { id: number; name: string; emoji: string; monthlyLimit: number; sortOrder: number }
export type TxSource = 'qr' | 'p2p' | 'sms' | 'manual';
export type TxStatus = 'pending' | 'confirmed' | 'cancelled';
export interface Transaction {
  id: number; amount: number; categoryId: number | null; payee: string; note: string;
  source: TxSource; status: TxStatus; smsHash: string | null; createdAt: number;
}
export type NewTransaction = Omit<Transaction, 'id' | 'smsHash' | 'status' | 'source' | 'createdAt'> &
  Partial<Pick<Transaction, 'smsHash' | 'status' | 'source' | 'createdAt'>>;
