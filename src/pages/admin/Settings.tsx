import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { tenantsApi } from "@/api/tenants";
import type { TenantFeature } from "@/types/tenant";

export default function Settings() {
  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => tenantsApi.getMe(),
  });

  const { data: featuresData, isLoading: featuresLoading } = useQuery({
    queryKey: ["tenant-features"],
    queryFn: () => tenantsApi.getFeatures(),
  });

  const tenant = tenantData?.data?.data;
  const features: TenantFeature[] = featuresData?.data?.data ?? [];
  const isLoading = tenantLoading || featuresLoading;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Manage your school's settings and feature toggles"
      />

      {tenant && (
        <div className="rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">School Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground font-medium">School Name</p>
              <p>{tenant.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Slug</p>
              <p className="font-mono">{tenant.slug}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Status</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  tenant.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Timezone</p>
              <p>{tenant.timezone}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Address</p>
              <p>{tenant.address ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Website</p>
              <p>{tenant.website ?? "—"}</p>
            </div>
          </div>
        </div>
      )}

      {features.length > 0 && (
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Feature Toggles</h2>
          <div className="space-y-3">
            {features.map((feature) => (
              <div key={feature.feature} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium capitalize">
                  {feature.feature.replace(/_/g, " ").toLowerCase()}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    feature.enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {feature.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
