import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { announcementsApi } from "@/api/announcements";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types/notification";

export default function AnnouncementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => announcementsApi.list(),
  });

  const announcements: Announcement[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Announcements"
        description="School-wide and class-level announcements"
        action={
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + New Announcement
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && announcements.length === 0 && (
        <EmptyState title="No announcements" description="Post an announcement to notify users." />
      )}

      {!isLoading && announcements.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Target Roles</th>
                <th className="px-4 py-3 text-left font-medium">End Date</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {announcements.map((ann) => (
                <tr key={ann.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{ann.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ann.targetRoles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ann.endDate ? formatDate(ann.endDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(ann.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
