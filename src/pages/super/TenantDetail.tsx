import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { tenantsApi } from "@/api/tenants";
import { formatDate } from "@/lib/utils";
import type { TenantFeature } from "@/types/tenant";

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenants", id],
    queryFn: () => tenantsApi.getById(id!),
    enabled: !!id,
  });

  const tenant = tenantData?.data?.data;
  const features: TenantFeature[] = tenant?.features ?? [];

  if (tenantLoading) return <LoadingSpinner />;

  if (!tenant) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    SUSPENDED: "bg-orange-100 text-orange-700",
    DISABLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Tenant Detail"
        action={
          <Link
            to="/super/tenants"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Tenants
          </Link>
        }
      />

      <div className="rounded-lg border p-6 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{tenant.name}</h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              statusColors[tenant.status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {tenant.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-medium">Slug</p>
            <p className="font-mono">{tenant.slug}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Timezone</p>
            <p>{tenant.timezone}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Language</p>
            <p>{tenant.language}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Website</p>
            <p>{tenant.website ?? "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground font-medium">Address</p>
            <p>{tenant.address ?? "—"}</p>
          </div>
          {tenant.createdAt && (
            <div>
              <p className="text-muted-foreground font-medium">Created</p>
              <p>{formatDate(tenant.createdAt)}</p>
            </div>
          )}
        </div>
      </div>

      {features.length > 0 && (
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Features</h2>
          <div className="space-y-2">
            {features.map((f) => (
              <div key={f.feature} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm capitalize">
                  {f.feature.replace(/_/g, " ").toLowerCase()}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    f.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {f.enabled ? "On" : "Off"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
