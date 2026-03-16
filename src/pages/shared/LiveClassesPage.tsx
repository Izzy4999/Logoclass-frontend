import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { liveClassesApi } from "@/api/live-classes";
import { formatDateTime } from "@/lib/utils";
import type { LiveClass } from "@/types/notification";

export default function LiveClassesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["live-classes"],
    queryFn: () => liveClassesApi.list(),
  });

  const liveClasses: LiveClass[] = data?.data?.data ?? [];

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    LIVE: "bg-green-100 text-green-700",
    ENDED: "bg-gray-100 text-gray-500",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Live Classes"
        description="Schedule and manage live class sessions"
        action={
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + Schedule Class
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && liveClasses.length === 0 && (
        <EmptyState title="No live classes found" description="Schedule your first live class session." />
      )}

      {!isLoading && liveClasses.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Scheduled At</th>
                <th className="px-4 py-3 text-left font-medium">Duration (min)</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {liveClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{cls.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(cls.scheduledAt)}</td>
                  <td className="px-4 py-3">{cls.duration ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[cls.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {cls.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(cls.status === "SCHEDULED" || cls.status === "LIVE") && (
                      <Link
                        to={`${cls.id}/room`}
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Join
                      </Link>
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
