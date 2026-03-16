import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { usersApi } from "@/api/users";
import { formatDate } from "@/lib/utils";

export default function Profile() {
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.getMe(),
  });

  const user = data?.data?.data;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="My Profile" description="View and update your profile information" />

      {user && (
        <>
          <div className="rounded-lg border p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1">First Name</p>
                <input
                  type="text"
                  defaultValue={user.firstName}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 bg-muted/40 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Last Name</p>
                <input
                  type="text"
                  defaultValue={user.lastName}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 bg-muted/40 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Email</p>
                <input
                  type="email"
                  defaultValue={user.email}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 bg-muted/40 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Phone</p>
                <input
                  type="text"
                  defaultValue={user.phone ?? ""}
                  readOnly
                  className="w-full border rounded-md px-3 py-2 bg-muted/40 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Role</p>
                <p className="text-sm">{user.role?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Member Since</p>
                <p className="text-sm">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Current Password</p>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">New Password</p>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Confirm New Password</p>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                disabled
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md opacity-50 cursor-not-allowed"
              >
                Update Password (Coming Soon)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
