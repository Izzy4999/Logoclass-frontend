import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Users as UsersIcon } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { tenantsApi } from "@/api/tenants";
import { usersApi } from "@/api/users";
import { formatDate } from "@/lib/utils";

export default function SuperUsers() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: tenantsData } = useQuery({
    queryKey: ["tenants", { limit: 100 }],
    queryFn: () => tenantsApi.list({ limit: 100 }),
  });

  const tenants = tenantsData?.data?.data ?? [];

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["super-users-list", selectedTenantId, search],
    queryFn: () =>
      usersApi.list({
        tenantId: selectedTenantId || undefined,
        search: search || undefined,
        limit: 50,
      }),
    enabled: !!selectedTenantId,
  });

  const users = usersData?.data?.data ?? [];
  const total = usersData?.data?.meta?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Platform Users"
        description="View users across all schools"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
        >
          <option value="">— Select a school —</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      {/* Empty prompt */}
      {!selectedTenantId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 rounded-full bg-brand-50 flex items-center justify-center">
            <UsersIcon className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold text-foreground">Select a school</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Choose a school from the dropdown above to view its users.
          </p>
        </div>
      )}

      {/* Loading */}
      {selectedTenantId && isLoading && <LoadingSpinner />}

      {/* Users table */}
      {selectedTenantId && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {users.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-2">
              <UsersIcon className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No users found.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">{total} user{total !== 1 ? "s" : ""} found</p>
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
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
