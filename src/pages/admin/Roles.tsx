import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { rolesApi } from "@/api/roles";
import type { Role } from "@/types/role";

export default function Roles() {
  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list(),
  });

  const roles: Role[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Roles"
        description="Manage user roles and permissions"
        action={
          <Link
            to="/admin/roles/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Add Role
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && roles.length === 0 && (
        <EmptyState title="No roles found" description="Create your first role to manage user permissions." />
      )}

      {!isLoading && roles.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Permissions</th>
                <th className="px-4 py-3 text-left font-medium">Default?</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{role.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {role.permissions?.length ?? 0} permissions
                  </td>
                  <td className="px-4 py-3">
                    {role.isDefault ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Default
                      </span>
                    ) : (
                      "—"
                    )}
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
