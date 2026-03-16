import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { notificationsApi } from "@/api/notifications";
import { formatRelative } from "@/lib/utils";
import type { Notification } from "@/types/notification";

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications: Notification[] = data?.data?.data ?? [];

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Stay up to date with recent activity"
        action={
          <button
            onClick={() => markAllRead()}
            className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted"
          >
            Mark All Read
          </button>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && notifications.length === 0 && (
        <EmptyState title="No notifications" description="You're all caught up!" />
      )}

      {!isLoading && notifications.length > 0 && (
        <div className="rounded-md border divide-y">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 flex gap-3 items-start transition-colors ${
                notif.isRead ? "opacity-60" : "bg-primary/5"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                  notif.isRead ? "bg-muted-foreground" : "bg-primary"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm font-medium truncate">{notif.title}</p>
                  <p className="text-xs text-muted-foreground flex-shrink-0">
                    {formatRelative(notif.createdAt)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{notif.body}</p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground mt-1">
                  {notif.type.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
