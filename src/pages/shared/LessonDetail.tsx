import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { lessonsApi } from "@/api/lessons";
import { formatDate } from "@/lib/utils";
import type { LessonAttachment } from "@/types/lesson";

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["lessons", id],
    queryFn: () => lessonsApi.getById(id!),
    enabled: !!id,
  });

  const lesson = data?.data?.data;
  const attachments: LessonAttachment[] = lesson?.attachments ?? [];

  if (isLoading) return <LoadingSpinner />;

  if (!lesson) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={lesson.title}
        action={
          <Link to=".." className="text-sm text-muted-foreground hover:text-foreground">
            Back to Lessons
          </Link>
        }
      />

      <div className="rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              lesson.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {lesson.isPublished ? "Published" : "Draft"}
          </span>
          <span className="text-muted-foreground text-xs">Order: {lesson.order}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{lesson.description ?? "No description."}</p>
        <p className="text-xs text-muted-foreground">Created: {formatDate(lesson.createdAt)}</p>
      </div>

      <div className="rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          Attachments ({attachments.length})
        </h2>
        {attachments.length === 0 ? (
          <EmptyState title="No attachments" description="No files or links attached to this lesson." />
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between p-3 rounded-md border text-sm">
                <div>
                  <p className="font-medium">{att.title ?? "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{att.contentType}</p>
                </div>
                <a
                  href={att.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {lesson.quiz && (
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Quiz</h2>
          <p className="text-sm font-medium">{lesson.quiz.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {lesson.quiz.questionCount} questions
            {lesson.quiz.timeLimit ? ` · ${lesson.quiz.timeLimit} min limit` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
