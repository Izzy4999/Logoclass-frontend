import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { actionLogsApi, type ActionLog } from "@/api/action-logs";
import { formatDateTime } from "@/lib/utils";

export default function ActionLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ["action-logs"],
    queryFn: () => actionLogsApi.list(),
  });

  const logs: ActionLog[] = data?.data?.data ?? [];

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Action Logs"
        description="Audit trail of all actions performed in the system"
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && logs.length === 0 && (
        <EmptyState title="No logs found" description="System action logs will appear here." />
      )}

      {!isLoading && logs.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Actor</th>
                <th className="px-4 py-3 text-left font-medium">Entity</th>
                <th className="px-4 py-3 text-left font-medium">Entity ID</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    {log.actor.firstName} {log.actor.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.entity}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {log.entityId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        actionColors[log.action] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
