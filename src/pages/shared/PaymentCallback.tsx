import { useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { paymentsApi } from "@/api/payments";

export default function PaymentCallback() {
  const [params] = useSearchParams();

  // Paystack sends ?reference=xxx&trxref=xxx
  // Flutterwave sends ?transaction_id=xxx&status=xxx&tx_ref=xxx
  const reference =
    params.get("reference") ||
    params.get("trxref")    ||
    params.get("tx_ref")    ||
    "";

  const calledRef = useRef(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["payment-verify", reference],
    queryFn: () => paymentsApi.verify(reference),
    enabled: !!reference && !calledRef.current,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data || isError) calledRef.current = true;
  }, [data, isError]);

  const payment = data?.data?.data;
  const isPaid  = payment?.status === "PAID";

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!reference) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-sm w-full text-center">
          <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">Invalid Callback</h2>
          <p className="text-sm text-muted-foreground mb-6">No payment reference found in the URL.</p>
          <Link to="/payments" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
            Go to Payments <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-sm w-full text-center"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-1">Verifying Payment…</h2>
            <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction.</p>
          </>
        ) : isError ? (
          <>
            <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-1">Verification Failed</h2>
            <p className="text-sm text-muted-foreground mb-2">
              We couldn't verify this payment. It may have already been processed or the reference is invalid.
            </p>
            <p className="text-xs text-muted-foreground font-mono bg-slate-50 rounded px-2 py-1 inline-block mb-6">
              {reference}
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/payments"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90">
                View Payments <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/fees" className="text-sm text-muted-foreground hover:text-foreground">
                Back to Fees
              </Link>
            </div>
          </>
        ) : isPaid ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="h-20 w-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-1">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground mb-4">Your payment has been confirmed.</p>

            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {payment?.currency ?? "NGN"} {Number(payment?.amount ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{payment?.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span>{payment?.method ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-green-700 font-semibold">PAID</span>
              </div>
            </div>

            <Link
              to="/payments"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl w-full"
            >
              View Payment History <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <>
            <XCircle className="h-14 w-14 text-orange-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-1">Payment Not Completed</h2>
            <p className="text-sm text-muted-foreground mb-2">
              The transaction was not completed or is still pending.
            </p>
            {payment?.status && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 inline-block mb-6">
                {payment.status}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <Link to="/fees"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90">
                Try Again
              </Link>
              <Link to="/payments" className="text-sm text-muted-foreground hover:text-foreground">
                View Payments
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
