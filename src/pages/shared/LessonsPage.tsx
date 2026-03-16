import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { lessonsApi } from "@/api/lessons";
import type { Lesson } from "@/types/lesson";

export default function LessonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => lessonsApi.list(),
  });

  const lessons: Lesson[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Lessons"
        description="Browse and manage all lessons"
        action={
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
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
                <th className="px-4 py-3 text-left font-medium">Published?</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{lesson.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lesson.classId}</td>
                  <td className="px-4 py-3">{lesson.order}</td>
                  <td className="px-4 py-3">{lesson.attachmentCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        lesson.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {lesson.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`${lesson.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      View
                    </Link>
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
