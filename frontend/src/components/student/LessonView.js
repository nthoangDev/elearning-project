import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Card, Button, Alert, Badge, Spinner } from "react-bootstrap";
import { authApis, endpoints } from "../../configs/Apis";
import AssignmentSubmitModal from "./AssignmentSubmitModal";
import QuizSubmitModal from "./QuizSubmitModal";
import AssignmentFeedbackThread from "../../components/student/AssignmentFeedbackThread";

const api = () => authApis();

// ===== Utils: nhận diện & chuyển URL YouTube thành embed =====
function getYouTubeEmbedUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const hosts = new Set([
      "www.youtube.com",
      "youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtu.be",
    ]);
    if (!hosts.has(u.hostname)) return null;

    if (u.pathname === "/watch" && u.searchParams.get("v")) {
      const id = u.searchParams.get("v");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.pathname.startsWith("/embed/")) {
      const id = u.pathname.split("/embed/")[1];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/shorts/")[1];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function LessonView() {
  const { lessonId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [lesson, setLesson] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // per-assessment thread summaries (latest submission)
  const [threads, setThreads] = useState({}); // { [assessmentId]: { assessment, submission, comments } }
  const [threadsLoading, setThreadsLoading] = useState(false);

  // modals & views
  const [asmSubmitId, setAsmSubmitId] = useState(null); // mở modal nộp bài
  const [quizId, setQuizId] = useState(null);
  const [asmViewId, setAsmViewId] = useState(null); // mở thread xem kết quả

  const clearParam = (key) => {
    const sp = new URLSearchParams(searchParams);
    sp.delete(key);
    setSearchParams(sp, { replace: true });
  };

  const loadLesson = async (id) => {
    try {
      setLoading(true);
      setErr("");
      const url = endpoints?.studentLesson?.(id) || `/api/student/lessons/${id}`;
      const res = await api().get(url);
      setLesson(res.data?.lesson || null);
      setAssessments(res.data?.assessments || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Không tải được bài học");
      setLesson(null);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load thread tóm tắt cho từng assessment (để biết đã nộp chưa, điểm, trạng thái…)
  const loadThreads = async (items) => {
    if (!items?.length) { setThreads({}); return; }
    setThreadsLoading(true);
    try {
      const results = await Promise.allSettled(
        items.map(async (a) => {
          const url =
            endpoints?.assessmentThread?.(a._id) ||
            `/api/student/assessments/${a._id}/thread`;
          const r = await api().get(url);
          return { id: a._id, data: r.data || {} };
        })
      );
      const map = {};
      results.forEach((p) => {
        if (p.status === "fulfilled" && p.value?.id) {
          map[p.value.id] = p.value.data;
        }
      });
      setThreads(map);
    } catch {
      // bỏ qua, vẫn render danh sách cơ bản
    } finally {
      setThreadsLoading(false);
    }
  };

  useEffect(() => {
    if (!lessonId) return;
    let alive = true;
    (async () => {
      await loadLesson(lessonId);
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [lessonId]);

  // Khi danh sách assessments sẵn sàng -> nạp thread tóm tắt
  useEffect(() => {
    if (assessments?.length) loadThreads(assessments);
  }, [assessments]);

  // Auto mở modal theo query (?quiz= / ?assignment=)
  useEffect(() => {
    if (!assessments?.length) return;
    const q = searchParams.get("quiz");
    const a = searchParams.get("assignment");

    if (q) {
      const ok = assessments.find(
        (x) => x._id === q && String(x.assessmentType).toUpperCase() === "QUIZ"
      );
      if (ok) setQuizId(q);
      else clearParam("quiz");
    }

    if (a) {
      const ok = assessments.find(
        (x) => x._id === a && String(x.assessmentType).toUpperCase() === "ASSIGNMENT"
      );
      if (ok) setAsmSubmitId(a);
      else clearParam("assignment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessments, searchParams]);

  const mark = async (kind) => {
    if (!lesson?._id) return;
    setActLoading(true);
    setErr("");
    setMsg("");
    try {
      const url =
        kind === "done"
          ? endpoints?.studentLessonComplete?.(lesson._id) || `/api/student/lessons/${lesson._id}/complete`
          : endpoints?.studentLessonUncomplete?.(lesson._id) || `/api/student/lessons/${lesson._id}/uncomplete`;
      await api().post(url, {});
      setMsg(kind === "done" ? "Đã đánh dấu hoàn thành." : "Đã bỏ đánh dấu hoàn thành.");
    } catch (e) {
      setErr(e?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setActLoading(false);
    }
  };

  const primaryUrl =
    lesson?.resources?.find((r) => r.isPrimary)?.url ||
    lesson?.resources?.[0]?.url;

  const ytEmbedUrl = getYouTubeEmbedUrl(primaryUrl);

  // Assessment (đang xem kết quả) để show thread bên dưới
  const currentAssessment = useMemo(() => {
    if (!assessments?.length) return null;
    return assessments.find(a => a._id === asmViewId) || null;
  }, [assessments, asmViewId]);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">{lesson?.title || "Bài học"}</h3>
        <div className="d-flex gap-2">
          <Button variant="outline-success" onClick={() => mark("done")} disabled={actLoading}>
            Đánh dấu hoàn thành
          </Button>
          <Button variant="outline-secondary" onClick={() => mark("undo")} disabled={actLoading}>
            Bỏ đánh dấu
          </Button>
        </div>
      </div>

      {msg && <Alert variant="success">{msg}</Alert>}
      {err && <Alert variant="danger">{err}</Alert>}
      {loading && <div className="text-muted">Đang tải…</div>}

      {lesson && (
        <Card className="mb-4">
          <Card.Body>
            {lesson.type === "VIDEO" && primaryUrl && (
              <div className="ratio ratio-16x9 mb-3">
                {ytEmbedUrl ? (
                  <iframe
                    src={`${ytEmbedUrl}?rel=0&modestbranding=1`}
                    title={lesson?.title || "YouTube video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    frameBorder="0"
                  />
                ) : (
                  <video src={primaryUrl} controls />
                )}
              </div>
            )}

            {lesson.type === "DOCUMENT" && (
              <div className="mb-3">
                {primaryUrl ? (
                  <a href={primaryUrl} target="_blank" rel="noreferrer" className="btn btn-outline-primary">
                    Mở tài liệu
                  </a>
                ) : (
                  <div className="text-muted">Chưa có tài nguyên</div>
                )}
              </div>
            )}

            {lesson.contentText && (
              <Card.Text style={{ whiteSpace: "pre-wrap" }}>
                {lesson.contentText}
              </Card.Text>
            )}

            {lesson.resources?.length > 1 && (
              <>
                <div className="fw-semibold">Tài nguyên khác</div>
                <ul className="mb-0">
                  {lesson.resources.slice(1).map((r, idx) => (
                    <li key={idx}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title || r.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card.Body>
        </Card>
      )}

      <div className="d-flex align-items-center gap-2 mb-2">
        <h5 className="mb-0">Bài đánh giá</h5>
        {threadsLoading && (
          <small className="text-muted">
            <Spinner size="sm" animation="border" className="me-1" />
            Đang kiểm tra trạng thái…
          </small>
        )}
      </div>

      {assessments.length === 0 ? (
        <div className="text-muted">Bài học này chưa có bài tập/quiz.</div>
      ) : (
        <div className="list-group">
          {assessments.map((a) => {
            const t = threads[a._id];              // thread tóm tắt
            const sub = t?.submission || null;     // lần nộp mới nhất (nếu có)
            const hasSubmission = !!sub;

            return (
              <div
                key={a._id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div className="me-3">
                  <div className="fw-semibold d-flex align-items-center gap-2">
                    {a.title}
                    {hasSubmission && sub.status && (
                      <Badge bg={
                        sub.status === "GRADED" ? "success" :
                        sub.status === "RETURNED" ? "info" :
                        sub.status === "SUBMITTED" ? "warning" : "secondary"
                      }>
                        {sub.status}
                      </Badge>
                    )}
                  </div>
                  <small className="text-muted d-block">
                    Loại: {a.assessmentType} • Hạn: {a.dueAt ? new Date(a.dueAt).toLocaleString() : "—"}
                  </small>
                  {hasSubmission && (
                    <small className="d-block">
                      Điểm:{" "}
                      <strong>
                        {typeof sub.score === "number" ? `${sub.score}%` : "—"}
                      </strong>{" "}
                      • Kết quả:{" "}
                      {sub.pass === true ? <Badge bg="success">ĐẠT</Badge> :
                       sub.pass === false ? <Badge bg="danger">CHƯA ĐẠT</Badge> :
                       <span className="text-muted">Chưa có</span>}
                    </small>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2">
                {a.assessmentType === "ASSIGNMENT" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => setAsmViewId(a._id)}
                    >
                      Xem kết quả
                    </Button>

                    {!hasSubmission ? (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => setAsmSubmitId(a._id)}
                      >
                        Nộp bài
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => setAsmSubmitId(a._id)}
                      >
                        Nộp lại
                      </Button>
                    )}
                  </>
                  )}
                  {a.assessmentType === "QUIZ" && (
                    <>
                      {!hasSubmission && (
                        <Button
                          size="sm"
                          variant="outline-success"
                          onClick={() => setQuizId(a._id)}
                        >
                          Làm quiz
                        </Button>
                      )}
                      {hasSubmission && (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => setQuizId(a._id)}
                        >
                          Xem kết quả
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3">
        {lesson?.course && (
          <Link to={`/learning/course/${lesson.course}`} className="btn btn-outline-secondary">
            ⬅ Về outline khoá
          </Link>
        )}
      </div>

      {/* Modals */}
      <AssignmentSubmitModal
        show={!!asmSubmitId}
        assessmentId={asmSubmitId}
        onHide={() => {
          setAsmSubmitId(null);
          clearParam("assignment");
        }}
        onSubmitted={async () => {
          setMsg("Đã gửi bài tập.");
          setAsmSubmitId(null);
          await loadThreads(assessments); // refresh trạng thái
        }}
      />
      <QuizSubmitModal
        show={!!quizId}
        assessmentId={quizId}
        onHide={() => {
          setQuizId(null);
          clearParam("quiz");
        }}
        onSubmitted={async () => {
          setMsg("Đã nộp quiz.");
          await loadThreads(assessments); // refresh trạng thái
        }}
      />

      {/* Thread phản hồi — chỉ khi xem ASSIGNMENT */}
      {currentAssessment?.assessmentType === "ASSIGNMENT" && currentAssessment?._id && (
        <div className="mt-4">
          <AssignmentFeedbackThread
            key={currentAssessment._id}
            assessmentId={currentAssessment._id}
          />
        </div>
      )}
    </div>
  );
}
