import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronR, Activity } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { actionLogsApi, type ActionLog } from "@/api/action-logs";
import { formatDateTime } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
  LOGIN:  "bg-purple-50 text-purple-700",
  LOGOUT: "bg-slate-100 text-slate-600",
};

const ENTITY_TYPES = [
  "USER", "ROLE", "CLASS", "GRADE_LEVEL", "SUBJECT", "ACADEMIC_YEAR", "TERM",
  "ENROLLMENT", "LESSON", "ASSIGNMENT", "QUIZ", "EXAM", "ATTENDANCE",
  "FEE", "PAYMENT", "ANNOUNCEMENT", "LIVE_CLASS",
];

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];

export default function ActionLogs() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["action-logs", page, entityFilter, actionFilter, fromDate, toDate],
    queryFn: () => actionLogsApi.list({
      page, limit: 30,
      entity: entityFilter || undefined,
      action: actionFilter || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
  });

  const allLogs: ActionLog[] = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  // Client-side actor search
  const logs = search.trim()
    ? allLogs.filter(l =>
        `${l.actor.firstName} ${l.actor.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        l.entity?.toLowerCase().includes(search.toLowerCase()) ||
        l.entityId?.toLowerCase().includes(search.toLowerCase())
      )
    : allLogs;

  const hasFilters = entityFilter || actionFilter || fromDate || toDate;

  const clearFilters = () => { setEntityFilter(""); setActionFilter(""); setFromDate(""); setToDate(""); setPage(1); };

  const renderJson = (obj: Record<string, unknown> | null) => {
    if (!obj || Object.keys(obj).length === 0) return <span className="text-muted-foreground text-xs">—</span>;
    return (
      <pre className="text-xs bg-slate-50 rounded-lg p-2 overflow-x-auto max-h-32 overflow-y-auto text-slate-700 font-mono leading-relaxed">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  return (
    <div>
      <PageHeader
        title="Action Logs"
        description="Full audit trail of all system actions"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search actor or entity…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-52" />
        </div>
        <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All entities</option>
          {ENTITY_TYPES.map(e => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
        </select>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 bg-white">
          <option value="">All actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="px-2 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30" />
          <span>to</span>
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="px-2 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-2 text-xs text-muted-foreground border border-slate-200 rounded-lg hover:bg-slate-50">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {isLoading ? <LoadingSpinner /> : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Activity className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No logs found</p>
          <p className="text-sm text-muted-foreground">System action logs will appear here.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">{meta?.total ?? logs.length} events</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Actor", "Action", "Entity", "Entity ID", "Timestamp", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <>
                    <tr key={log.id} className={`hover:bg-slate-50 ${expandedId === log.id ? "bg-slate-50" : ""}`}>
                      <td className="px-4 py-3 font-medium">
                        {log.actor.firstName} {log.actor.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.entity?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.entityId ? `${log.entityId.slice(0, 8)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        {(log.oldData || log.newData) && (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="p-1.5 rounded text-muted-foreground hover:bg-slate-100">
                            {expandedId === log.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronR className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-slate-50">
                        <td colSpan={6} className="px-4 pb-4 pt-0">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Before</p>
                              {renderJson(log.oldData)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">After</p>
                              {renderJson(log.newData)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Page {meta.page} of {meta.totalPages} · {meta.total} total events</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
