import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Save, Loader2, Eye, EyeOff, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { tenantsApi } from "@/api/tenants";
import { paymentsApi } from "@/api/payments";
import type { PaymentProvider } from "@/types/payment";

type Tab = "school" | "payment";

const PROVIDERS: { value: PaymentProvider; label: string; color: string }[] = [
  { value: "FLUTTERWAVE", label: "Flutterwave", color: "bg-yellow-500" },
  { value: "PAYSTACK",    label: "Paystack",    color: "bg-green-500"  },
  { value: "STRIPE",      label: "Stripe",      color: "bg-purple-500" },
];

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-slate-50 last:border-0">
      <label className="text-sm font-medium text-muted-foreground pt-2">{label}</label>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
    />
  );
}

function SaveBar({ loading, onSave, onReset }: { loading: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
      <button onClick={onReset} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">
        Reset
      </button>
      <button
        onClick={onSave}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save changes
      </button>
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("school");
  const [showSecret, setShowSecret] = useState(false);
  const [deletePayConfirm, setDeletePayConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // School form state
  const [schoolForm, setSchoolForm] = useState({ address: "", website: "", timezone: "", language: "" });
  const [schoolSynced, setSchoolSynced] = useState(false);

  // Payment form state
  const [payForm, setPayForm] = useState({ provider: "PAYSTACK" as PaymentProvider, publicKey: "", secretKey: "" });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: tenantData, isLoading: tLoad } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => tenantsApi.getMe(),
  });

  useEffect(() => {
    const t = tenantData?.data?.data;
    if (t && !schoolSynced) {
      setSchoolForm({ address: t.address ?? "", website: t.website ?? "", timezone: t.timezone, language: t.language });
      setSchoolSynced(true);
    }
  }, [tenantData, schoolSynced]);

  const { data: payConfigData, isLoading: pLoad } = useQuery({
    queryKey: ["pay-config"],
    queryFn: () => paymentsApi.getConfig(),
    retry: false,
  });

  const tenant = tenantData?.data?.data;
  const payConfig = payConfigData?.data?.data;

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const updateTenant = useMutation({
    mutationFn: (dto: Parameters<typeof tenantsApi.updateMe>[0]) => tenantsApi.updateMe(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant-me"] }); showToast("School info updated"); },
    onError: () => showToast("Failed to update school info", false),
  });

  const savePayConfig = useMutation({
    mutationFn: (dto: { provider: string; publicKey?: string; secretKey: string }) => paymentsApi.saveConfig(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pay-config"] }); showToast("Payment config saved"); },
    onError: () => showToast("Failed to save payment config", false),
  });

  const deletePayConfig = useMutation({
    mutationFn: () => paymentsApi.deleteConfig(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pay-config"] }); setDeletePayConfirm(false); showToast("Payment config removed"); },
    onError: () => showToast("Failed to delete config", false),
  });

  if (tLoad) return <LoadingSpinner />;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "school",  label: "School Info", icon: Building2  },
    { key: "payment", label: "Payment",     icon: CreditCard },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Manage your school's configuration and integrations" />

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 mb-4 px-4 py-3 rounded-lg text-sm ${toast.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── School Info Tab ─────────────────────────────────────────────── */}
      {tab === "school" && tenant && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <FieldRow label="School name">
            <p className="text-sm font-medium pt-2">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">Contact support to change school name</p>
          </FieldRow>
          <FieldRow label="Slug">
            <code className="text-sm bg-slate-50 px-2 py-1.5 rounded border border-slate-200 block font-mono">{tenant.slug}</code>
          </FieldRow>
          <FieldRow label="Status">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border mt-1 ${
              tenant.status === "ACTIVE" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"
            }`}>
              {tenant.status}
            </span>
          </FieldRow>
          <FieldRow label="Website">
            <Input value={schoolForm.website} onChange={v => setSchoolForm(f => ({ ...f, website: v }))} placeholder="https://yourschool.edu.ng" />
          </FieldRow>
          <FieldRow label="Address">
            <Input value={schoolForm.address} onChange={v => setSchoolForm(f => ({ ...f, address: v }))} placeholder="123 School Road, Lagos" />
          </FieldRow>
          <FieldRow label="Timezone">
            <Input value={schoolForm.timezone} onChange={v => setSchoolForm(f => ({ ...f, timezone: v }))} placeholder="Africa/Lagos" />
          </FieldRow>
          <FieldRow label="Language">
            <Input value={schoolForm.language} onChange={v => setSchoolForm(f => ({ ...f, language: v }))} placeholder="en" />
          </FieldRow>
          <SaveBar
            loading={updateTenant.isPending}
            onSave={() => updateTenant.mutate({ address: schoolForm.address, website: schoolForm.website, timezone: schoolForm.timezone, language: schoolForm.language })}
            onReset={() => {
              if (tenant) setSchoolForm({ address: tenant.address ?? "", website: tenant.website ?? "", timezone: tenant.timezone, language: tenant.language });
            }}
          />
        </div>
      )}

      {/* ── Payment Tab ─────────────────────────────────────────────────── */}
      {tab === "payment" && (
        <div className="space-y-5">
          {/* Current config status */}
          {!pLoad && payConfig && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {payConfig.provider} is configured and active
                </span>
              </div>
              <button
                onClick={() => setDeletePayConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs text-muted-foreground mb-5">
              Configure your payment gateway to accept school fees online. Your secret key is encrypted at rest.
            </p>

            <FieldRow label="Provider">
              <div className="flex gap-2 flex-wrap">
                {PROVIDERS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPayForm(f => ({ ...f, provider: p.value }))}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
                      payForm.provider === p.value
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-slate-200 text-muted-foreground hover:border-slate-300"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${p.color}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label="Public key">
              <Input
                value={payForm.publicKey}
                onChange={v => setPayForm(f => ({ ...f, publicKey: v }))}
                placeholder={payForm.provider === "STRIPE" ? "pk_live_..." : payForm.provider === "PAYSTACK" ? "pk_live_..." : "FLWPUBK-..."}
              />
              <p className="text-xs text-muted-foreground mt-1">Used for client-side payment initialisation</p>
            </FieldRow>

            <FieldRow label="Secret key">
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={payForm.secretKey}
                  onChange={e => setPayForm(f => ({ ...f, secretKey: e.target.value }))}
                  placeholder={payForm.provider === "STRIPE" ? "sk_live_..." : payForm.provider === "PAYSTACK" ? "sk_live_..." : "FLWSECK-..."}
                  className="w-full px-3 py-2 pr-9 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Never share your secret key publicly</p>
            </FieldRow>

            <SaveBar
              loading={savePayConfig.isPending}
              onSave={() => {
                if (!payForm.secretKey) return showToast("Secret key is required", false);
                savePayConfig.mutate({ provider: payForm.provider, publicKey: payForm.publicKey || undefined, secretKey: payForm.secretKey });
              }}
              onReset={() => setPayForm({ provider: "PAYSTACK", publicKey: "", secretKey: "" })}
            />
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm mb-2">Quick setup guides</p>
            <p>• <strong>Paystack:</strong> Dashboard → Settings → API Keys & Webhooks</p>
            <p>• <strong>Flutterwave:</strong> Dashboard → Settings → API → Live Keys</p>
            <p>• <strong>Stripe:</strong> Dashboard → Developers → API Keys</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletePayConfirm}
        onClose={() => setDeletePayConfirm(false)}
        onConfirm={() => deletePayConfig.mutate()}
        title="Remove Payment Config"
        message="This will remove your payment gateway configuration. Students won't be able to pay online until you set it up again."
        confirmLabel="Remove"
        loading={deletePayConfig.isPending}
      />
    </div>
  );
}
