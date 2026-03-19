export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentMethod = "ONLINE" | "CASH" | "BANK_TRANSFER";
export type PaymentProvider = "PAYSTACK" | "FLUTTERWAVE" | "STRIPE";
export type FeeCategory = "SCHOOL_FEES" | "EXAM_FEES" | "UNIFORM" | "BOOK_FEES" | "OTHER";

export interface Fee {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  category: FeeCategory;
  gradeLevelId: string | null;
  academicYearId: string | null;
  termId: string | null;
  dueDate: string | null;
  isActive: boolean;
  gradeLevel?: { id: string; name: string } | null;
  academicYear?: { id: string; name: string } | null;
  term?: { id: string; name: string } | null;
}

export interface FeeAssignment {
  id: string;
  fee: Fee;
  student?: { id: string; firstName: string; lastName: string };
  amountOverride: number | null;
  dueDate: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  reference: string;
  user?: { id: string; firstName: string; lastName: string };
  feeAssignment?: FeeAssignment;
  amount: number;
  currency: string;
  provider: PaymentProvider | null;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentUrl: string | null;
  paidAt: string | null;
}

export interface PaymentConfig {
  provider: PaymentProvider;
  isActive: boolean;
  createdAt: string;
}
