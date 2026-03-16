import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { tenantsApi } from "@/api/tenants";
import { formatDate } from "@/lib/utils";
import type { Tenant } from "@/types/tenant";

export default function Tenants() {
  const { data, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => tenantsApi.list(),
  });

  const tenants: Tenant[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    SUSPENDED: "bg-orange-100 text-orange-700",
    DISABLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Tenants"
        description="Manage all schools on the platform"
        action={
          <Link
            to="/super/tenants/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Add Tenant
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && tenants.length === 0 && (
        <EmptyState title="No tenants found" description="No schools have been registered yet." />
      )}

      {!isLoading && tenants.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[tenant.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tenant.createdAt ? formatDate(tenant.createdAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/super/tenants/${tenant.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
