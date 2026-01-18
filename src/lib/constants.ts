import { Home, Utensils, Zap, ShoppingCart, Car, CreditCard, Tv, Heart, ShoppingBag, MoreHorizontal } from "lucide-react";

export const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent", icon: Home },
  { value: "utilities", label: "Utilities", icon: Zap },
  { value: "grocery", label: "Grocery", icon: ShoppingCart },
  { value: "fast_food", label: "Fast Food", icon: Utensils },
  { value: "transport", label: "Transport", icon: Car },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "entertainment", label: "Entertainment", icon: Tv },
  { value: "healthcare", label: "Healthcare", icon: Heart },
  { value: "shopping", label: "Shopping", icon: ShoppingBag },
  { value: "other", label: "Other", icon: MoreHorizontal },
] as const;

export const PAYMENT_METHODS = [
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
] as const;

export const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "both", label: "Both" },
] as const;

export const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "student_loan", label: "Student Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "other", label: "Other" },
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]["value"];
export type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];
export type AccountType = typeof ACCOUNT_TYPES[number]["value"];
export type DebtType = typeof DEBT_TYPES[number]["value"];
