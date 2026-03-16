import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2, Ban, ShieldOff, RotateCcw, ChevronLeft,
  Building2, Globe, MapPin, Clock, Users, Loader2
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { tenantsApi } from "@/api/tenants";
import { usersApi } from "@/api/users";
import { formatDate } from "@/lib/utils";
import type { TenantFeature } from "@/types/tenant";

type TenantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DISABLED";

const STATUS_COLORS: Record<TenantStatus, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  ACTIVE:    "bg-green-100 text-green-700 border-green-200",
  SUSPENDED: "bg-orange-100 text-orange-700 border-orange-200",
  DISABLED:  "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ACTIONS: Record<TenantStatus, { label: string; icon: React.ElementType; next: TenantStatus; variant: string }[]> = {
  PENDING: [
    { label: "Approve School", icon: CheckCircle2, next: "ACTIVE",    variant: "bg-green-600 hover:bg-green-700 text-white" },
  ],
  ACTIVE: [
    { label: "Suspend",        icon: Ban,          next: "SUSPENDED", variant: "bg-orange-500 hover:bg-orange-600 text-white" },
    { label: "Disable",        icon: ShieldOff,    next: "DISABLED",  variant: "bg-red-600 hover:bg-red-700 text-white" },
  ],
  SUSPENDED: [
    { label: "Reactivate",     icon: RotateCcw,    next: "ACTIVE",    variant: "bg-green-600 hover:bg-green-700 text-white" },
    { label: "Disable",        icon: ShieldOff,    next: "DISABLED",  variant: "bg-red-600 hover:bg-red-700 text-white" },
  ],
  DISABLED: [
    { label: "Reactivate",     icon: RotateCcw,    next: "ACTIVE",    variant: "bg-green-600 hover:bg-green-700 text-white" },
  ],
};

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "users">("info");

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["tenants", id],
    queryFn: () => tenantsApi.getById(id!),
    enabled: !!id,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["super-users", id],
    queryFn: () => usersApi.list({ tenantId: id, limit: 50 }),
    enabled: !!id && activeTab === "users",
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: TenantStatus) => tenantsApi.updateStatus(id!, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants", id] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const tenant = tenantData?.data?.data;
  if (!tenant) return <p className="p-6 text-muted-foreground">Tenant not found.</p>;

  const status = tenant.status as TenantStatus;
  const features: TenantFeature[] = tenant.features ?? [];
  const users = usersData?.data?.data ?? [];
  const actions = STATUS_ACTIONS[status] ?? [];

  return (
    <div>
      <PageHeader
        title={tenant.name}
        description={`/${tenant.slug}`}
        action={
          <Link to="/super/tenants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> All Schools
          </Link>
        }
      />

      {/* Status + action buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_COLORS[status]}`}>
          {status}
        </span>

        {actions.map((action) => (
          <motion.button
            key={action.next}
            whileTap={{ scale: 0.96 }}
            onClick={() => statusMutation.mutate(action.next)}
            disabled={statusMutation.isPending}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${action.variant}`}
          >
            {statusMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <action.icon className="h-4 w-4" />
            }
            {action.label}
          </motion.button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(["info", "users"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "users" ? "Users" : "School Info"}
          </button>
        ))}
      </div>

      {/* School Info tab */}
      {activeTab === "info" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { icon: Globe,     label: "Website",  value: tenant.website ?? "—" },
                { icon: MapPin,    label: "Address",  value: tenant.address ?? "—" },
                { icon: Clock,     label: "Timezone", value: tenant.timezone },
                { icon: Building2, label: "Language", value: tenant.language },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">{label}: </span>
                    <span className="font-medium">{value}</span>
                  </div>
                </div>
              ))}
              {tenant.createdAt && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Registered: </span>
                    <span className="font-medium">{formatDate(tenant.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {features.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-foreground mb-4">Feature Flags</h3>
              <div className="space-y-2">
                {features.map((f) => (
                  <div key={f.feature} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm capitalize">{f.feature.replace(/_/g, " ").toLowerCase()}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.enabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {f.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {usersLoading ? (
            <LoadingSpinner />
          ) : users.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-2">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No users found for this school.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{u.firstName} {u.lastName}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-brand-50 text-primary px-2 py-0.5 rounded-full font-medium">
                          {u.role?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
