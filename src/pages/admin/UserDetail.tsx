import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { usersApi } from "@/api/users";
import { formatDate } from "@/lib/utils";

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  });

  const user = data?.data?.data;

  if (isLoading) return <LoadingSpinner />;

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="User Detail"
        action={
          <Link
            to="/admin/users"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Users
          </Link>
        }
      />

      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground font-medium">Role</p>
            <p>{user.role?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Status</p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Phone</p>
            <p>{user.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Super Admin</p>
            <p>{user.isSuperAdmin ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Tenant</p>
            <p>{user.tenant?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Joined</p>
            <p>{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
