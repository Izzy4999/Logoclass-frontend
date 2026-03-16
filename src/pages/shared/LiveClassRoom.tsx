import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { liveClassesApi } from "@/api/live-classes";

export default function LiveClassRoom() {
  const { id } = useParams<{ id: string }>();

  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ["live-classes", id],
    queryFn: () => liveClassesApi.getById(id!),
    enabled: !!id,
  });

  const { data: joinData, isLoading: joinLoading } = useQuery({
    queryKey: ["live-classes", id, "join"],
    queryFn: () => liveClassesApi.join(id!),
    enabled: !!id,
    retry: false,
  });

  const liveClass = classData?.data?.data;
  const joinInfo = joinData?.data?.data;

  if (classLoading || joinLoading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title={liveClass?.title ?? "Live Class Room"}
        action={
          <Link to=".." className="text-sm text-muted-foreground hover:text-foreground">
            Back
          </Link>
        }
      />

      <div className="rounded-lg border p-8 flex flex-col items-center justify-center text-center min-h-64">
        {joinInfo ? (
          <>
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <span className="text-green-600 text-2xl">&#9654;</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Room Ready</h2>
            <p className="text-muted-foreground text-sm mb-2">
              Room: <span className="font-mono font-medium">{joinInfo.roomName}</span>
            </p>
            {joinInfo.url && (
              <a
                href={joinInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 mt-4"
              >
                Open in LiveKit
              </a>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              LiveKit room integration — embed the LiveKit component here.
            </p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-muted-foreground text-2xl">&#9679;</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Unable to Join</h2>
            <p className="text-muted-foreground text-sm">
              The class may not be live yet or you don't have access.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
