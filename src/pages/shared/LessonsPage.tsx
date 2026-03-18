import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { lessonsApi } from "@/api/lessons";
import type { Lesson } from "@/types/lesson";

export default function LessonsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => lessonsApi.list(),
  });

  const lessons: Lesson[] = data?.data?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => lessonsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lessons"] }); setDeleteTarget(null); },
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => lessonsApi.togglePublish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Lessons"
        description="Browse and manage all lessons"
        action={
          <Link to="new" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90">
            + Add Lesson
          </Link>
        }
      />

      {isLoading && <LoadingSpinner />}
      {!isLoading && lessons.length === 0 && (
        <EmptyState title="No lessons found" description="Create your first lesson to start teaching." />
      )}

      {!isLoading && lessons.length > 0 && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Attachments</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`${lesson.id}`} className="hover:text-primary hover:underline">{lesson.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lesson.classId}</td>
                  <td className="px-4 py-3">{lesson.order}</td>
                  <td className="px-4 py-3">{lesson.attachmentCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${lesson.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {lesson.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => publishMut.mutate(lesson.id)} disabled={publishMut.isPending} title={lesson.isPublished ? "Unpublish" : "Publish"} className="p-1 rounded text-muted-foreground hover:bg-slate-100">
                        {lesson.isPublished ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button onClick={() => navigate(`${lesson.id}/edit`)} className="p-1 rounded text-muted-foreground hover:bg-slate-100" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(lesson)} className="p-1 rounded text-red-500 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget!.id)}
        loading={deleteMut.isPending}
        title="Delete Lesson"
        message={`Delete "${deleteTarget?.title}"? All attachments will be removed.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
