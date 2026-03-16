import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { examsApi } from "@/api/exams";

export default function ExamRoom() {
  const { id } = useParams<{ id: string }>();

  const { data: examData, isLoading: examLoading } = useQuery({
    queryKey: ["exams", id],
    queryFn: () => examsApi.getById(id!),
    enabled: !!id,
  });

  const { data: joinData, isLoading: joinLoading } = useQuery({
    queryKey: ["exams", id, "join"],
    queryFn: () => examsApi.join(id!),
    enabled: !!id,
    retry: false,
  });

  const exam = examData?.data?.data;
  const joinInfo = joinData?.data?.data;

  if (examLoading || joinLoading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={exam?.title ?? "Exam Room"}
        action={<Link to=".." className="text-sm text-muted-foreground hover:text-foreground">Back</Link>}
      />

      {exam && (
        <div className="rounded-lg border p-4 mb-6 text-sm text-muted-foreground flex gap-6">
          <div>Duration: <span className="text-foreground font-medium">{exam.duration} min</span></div>
          <div>Total Marks: <span className="text-foreground font-medium">{exam.totalMarks}</span></div>
          {exam.passMark && (
            <div>Pass Mark: <span className="text-foreground font-medium">{exam.passMark}</span></div>
          )}
        </div>
      )}

      <div className="rounded-lg border p-8 flex flex-col items-center justify-center text-center min-h-64">
        {joinInfo ? (
          <>
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <span className="text-blue-600 text-2xl">&#9998;</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Exam Room Ready</h2>
            <p className="text-muted-foreground text-sm mb-2">
              Room: <span className="font-mono font-medium">{joinInfo.roomName}</span>
            </p>
            {exam?.instructions && (
              <p className="text-sm text-muted-foreground max-w-md mb-4 text-left rounded-md bg-muted p-3">
                {exam.instructions}
              </p>
            )}
            {joinInfo.url && (
              <a
                href={joinInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 mt-2"
              >
                Enter Exam Room
              </a>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Exam room integration — embed the proctoring/exam component here.
            </p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-muted-foreground text-2xl">&#9679;</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Cannot Join Exam</h2>
            <p className="text-muted-foreground text-sm">
              The exam room is not open yet or you are not a registered participant.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
