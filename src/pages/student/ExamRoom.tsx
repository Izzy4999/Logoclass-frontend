import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronLeft, ChevronRight, AlertTriangle,
  CheckCircle2, Flag, Send, BookOpen,
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { examsApi } from "@/api/exams";
import type { ExamQuestion, ExamAttempt } from "@/types/exam";
import { formatDate } from "@/lib/utils";

// ── Timer hook ────────────────────────────────────────────────────────────────
function useCountdown(seconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
      return;
    }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct  = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const urgent = remaining <= 300; // last 5 min

  return { mins, secs, pct, urgent, remaining };
}

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ attempt, exam }: { attempt: ExamAttempt; exam: { title: string; totalMarks: number; passMark?: number | null } }) {
  const navigate = useNavigate();
  const passed = exam.passMark != null
    ? attempt.totalScore >= exam.passMark
    : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-lg p-10 max-w-md w-full text-center"
      >
        <div className={`h-20 w-20 rounded-full mx-auto flex items-center justify-center mb-5 ${
          passed === true  ? "bg-green-100" :
          passed === false ? "bg-red-100"   : "bg-blue-100"
        }`}>
          {passed === true  ? <CheckCircle2 className="h-10 w-10 text-green-600" /> :
           passed === false ? <AlertTriangle className="h-10 w-10 text-red-500" /> :
                              <BookOpen className="h-10 w-10 text-blue-600" />}
        </div>

        <h2 className="text-2xl font-bold mb-1">
          {passed === true ? "Exam Passed! 🎉" : passed === false ? "Keep Practising" : "Exam Submitted"}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">{exam.title}</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Your Score</p>
            <p className="text-2xl font-extrabold text-foreground">{attempt.totalScore}</p>
            <p className="text-xs text-muted-foreground">/ {exam.totalMarks}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Percentage</p>
            <p className={`text-2xl font-extrabold ${passed === true ? "text-green-600" : passed === false ? "text-red-500" : "text-primary"}`}>
              {exam.totalMarks > 0 ? Math.round((attempt.totalScore / exam.totalMarks) * 100) : 0}%
            </p>
          </div>
          {attempt.status === "GRADED" && attempt.teacherNotes && (
            <div className="col-span-2 bg-blue-50 rounded-xl p-4 text-left">
              <p className="text-xs font-semibold text-blue-700 mb-1">Teacher Notes</p>
              <p className="text-sm text-blue-800">{attempt.teacherNotes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate("/exams")}
            className="w-full px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Back to Exams
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Confirm submit dialog ─────────────────────────────────────────────────────
function ConfirmSubmit({
  totalQ, answeredQ, onConfirm, onCancel, isPending,
}: {
  totalQ: number; answeredQ: number; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  const unanswered = totalQ - answeredQ;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Flag className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Submit Exam?</h3>
            <p className="text-xs text-muted-foreground">This cannot be undone</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Answered</span>
            <span className="font-semibold text-green-600">{answeredQ} / {totalQ}</span>
          </div>
          {unanswered > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unanswered</span>
              <span className="font-semibold text-red-500">{unanswered}</span>
            </div>
          )}
        </div>

        {unanswered > 0 && (
          <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            You have {unanswered} unanswered question{unanswered > 1 ? "s" : ""}. Unanswered questions score 0.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm border rounded-xl hover:bg-slate-50 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ExamRoom ─────────────────────────────────────────────────────────────
export default function ExamRoom() {
  const { id } = useParams<{ id: string }>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]           = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm]   = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // ── Fetch exam + check existing attempt ──────────────────────────────────
  const { data: examData, isLoading: examLoading } = useQuery({
    queryKey: ["exams", id],
    queryFn: () => examsApi.getById(id!),
    enabled: !!id,
  });

  const { data: attemptData, isLoading: attemptLoading } = useQuery({
    queryKey: ["exams", id, "my-attempt"],
    queryFn: () => examsApi.getMyAttempt(id!),
    enabled: !!id,
    retry: false,
  });

  const { mutate: submitExam, isPending: isSubmitting } = useMutation({
    mutationFn: () => examsApi.submitAttempt(id!, answers),
    onSuccess: () => setSubmitted(true),
    onError: () => setSubmitted(true), // show result regardless
  });

  const handleAutoSubmit = useCallback(() => {
    setAutoSubmitted(true);
    submitExam();
  }, [submitExam]);

  const exam      = examData?.data?.data;
  const questions: ExamQuestion[] = exam?.questions ?? [];
  const current   = questions[currentIndex];
  const durationSecs = (exam?.duration ?? 60) * 60;

  const { mins, secs, pct, urgent } = useCountdown(
    durationSecs,
    handleAutoSubmit,
  );

  const answeredCount = Object.keys(answers).length;

  // ── Already attempted ─────────────────────────────────────────────────────
  const existingAttempt: ExamAttempt | null = attemptData?.data?.data ?? null;

  if (examLoading || attemptLoading) return <LoadingSpinner />;
  if (!exam) return (
    <div className="p-6 text-center text-muted-foreground">Exam not found.</div>
  );

  if (existingAttempt || submitted) {
    const attempt = existingAttempt ?? ({ totalScore: 0, autoScore: 0, manualScore: null, status: "SUBMITTED", submittedAt: new Date().toISOString() } as ExamAttempt);
    return (
      <ResultScreen
        attempt={attempt}
        exam={{ title: exam.title, totalMarks: exam.totalMarks, passMark: exam.passMark }}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 max-w-xl">
        <Link to="/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Exams
        </Link>
        <div className="rounded-xl border p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <h2 className="font-semibold mb-1">{exam.title}</h2>
          <p className="text-sm text-muted-foreground">This exam has no questions yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Confirm dialog */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmSubmit
            totalQ={questions.length}
            answeredQ={answeredCount}
            onConfirm={() => { setShowConfirm(false); submitExam(); }}
            onCancel={() => setShowConfirm(false)}
            isPending={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Auto-submit overlay */}
      <AnimatePresence>
        {autoSubmitted && isSubmitting && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-8 text-center max-w-xs"
            >
              <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="font-semibold">Time's up! Auto-submitting…</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${urgent ? "bg-red-50 border-red-200" : "bg-white border-slate-200"} flex-shrink-0`}>
          <div className="min-w-0">
            <h1 className="font-bold text-foreground truncate text-sm sm:text-base">{exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              {answeredCount} / {questions.length} answered · {exam.totalMarks} marks total
            </p>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-lg flex-shrink-0 ${
            urgent ? "bg-red-100 border-red-300 text-red-700" : "bg-slate-100 border-slate-200 text-foreground"
          }`}>
            <Clock className={`h-4 w-4 ${urgent ? "text-red-600" : "text-muted-foreground"}`} />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
            className="ml-3 flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </button>
        </div>

        {/* Timer progress bar */}
        <div className="h-1 bg-slate-100 flex-shrink-0">
          <motion.div
            className={`h-1 transition-colors duration-300 ${urgent ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Question navigation panel ─────────────────────────────────── */}
          <aside className="hidden sm:flex flex-col w-56 border-r border-slate-200 bg-slate-50 p-4 flex-shrink-0 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Questions</p>

            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => {
                const answered = !!answers[q.id];
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-9 w-full rounded-lg text-xs font-bold transition-all ${
                      isCurrent   ? "bg-primary text-primary-foreground shadow-md" :
                      answered    ? "bg-green-100 text-green-700 border border-green-300" :
                                    "bg-white text-muted-foreground border border-slate-200 hover:border-primary/40"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary flex-shrink-0" />
                <span className="text-muted-foreground">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-100 border border-green-300 flex-shrink-0" />
                <span className="text-muted-foreground">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-white border border-slate-200 flex-shrink-0" />
                <span className="text-muted-foreground">Unanswered</span>
              </div>
            </div>
          </aside>

          {/* ── Question view ─────────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-8">
            {current && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-2xl"
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3 mb-6">
                    <span className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                      {currentIndex + 1}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-foreground leading-snug">{current.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {current.marks} mark{current.marks !== 1 ? "s" : ""} · {current.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  {/* MCQ / True-False options */}
                  {current.options && current.options.length > 0 ? (
                    <div className="space-y-2.5">
                      {current.options.map((option, i) => (
                        <motion.label
                          key={i}
                          whileHover={{ x: 2 }}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            answers[current.id] === option
                              ? "border-primary bg-primary/5"
                              : "border-slate-200 hover:border-primary/30 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            answers[current.id] === option ? "border-primary" : "border-slate-300"
                          }`}>
                            {answers[current.id] === option && (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <input
                            type="radio"
                            name={current.id}
                            value={option}
                            checked={answers[current.id] === option}
                            onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: option }))}
                            className="sr-only"
                          />
                          <span className="text-sm text-foreground">{option}</span>
                        </motion.label>
                      ))}
                    </div>
                  ) : (
                    /* Short answer */
                    <textarea
                      rows={4}
                      placeholder="Type your answer here…"
                      value={answers[current.id] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8">
                    <button
                      onClick={() => setCurrentIndex((i) => i - 1)}
                      disabled={currentIndex === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>

                    <span className="text-xs text-muted-foreground">
                      {currentIndex + 1} of {questions.length}
                    </span>

                    {currentIndex < questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentIndex((i) => i + 1)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowConfirm(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
                      >
                        <Send className="h-3.5 w-3.5" /> Finish
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
