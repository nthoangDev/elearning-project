import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Card, Button, Alert } from "react-bootstrap";
import { authApis, endpoints } from "../../configs/Apis";
import AssignmentSubmitModal from "./AssignmentSubmitModal";
import QuizSubmitModal from "./QuizSubmitModal";

const api = () => authApis();

// ===== Utils: nhận diện & chuyển URL YouTube thành embed =====
function getYouTubeEmbedUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);

    // chấp nhận các host phổ biến của YouTube
    const hosts = new Set([
      "www.youtube.com",
      "youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtu.be"
    ]);
    if (!hosts.has(u.hostname)) return null;

    // 1) https://www.youtube.com/watch?v=VIDEO_ID
    if (u.pathname === "/watch" && u.searchParams.get("v")) {
      const id = u.searchParams.get("v");
      return `https://www.youtube.com/embed/${id}`;
    }

    // 2) https://youtu.be/VIDEO_ID
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // 3) https://www.youtube.com/embed/VIDEO_ID
    if (u.pathname.startsWith("/embed/")) {
      const id = u.pathname.split("/embed/")[1];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // 4) https://www.youtube.com/shorts/VIDEO_ID
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

  // modals
  const [asmId, setAsmId] = useState(null);
  const [quizId, setQuizId] = useState(null);

  const clearParam = (key) => {
    const sp = new URLSearchParams(searchParams);
    sp.delete(key);
    setSearchParams(sp, { replace: true });
  };

  const loadLesson = async (id) => {
    try {
      setLoading(true);
      setErr("");
      const url =
        endpoints?.studentLesson?.(id) ||
        `/api/student/lessons/${id}`;
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

  useEffect(() => {
    if (!lessonId) return;
    let alive = true;
    (async () => {
      await loadLesson(lessonId);
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [lessonId]);

  // Khi danh sách assessments đã sẵn sàng, đọc query để auto mở modal
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
      if (ok) setAsmId(a);
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
          ? endpoints?.studentLessonComplete?.(lesson._id) ||
            `/api/student/lessons/${lesson._id}/complete`
          : endpoints?.studentLessonUncomplete?.(lesson._id) ||
            `/api/student/lessons/${lesson._id}/uncomplete`;
      await api().post(url, {});
      setMsg(
        kind === "done" ? "Đã đánh dấu hoàn thành." : "Đã bỏ đánh dấu hoàn thành."
      );
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

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">{lesson?.title || "Bài học"}</h3>
        <div className="d-flex gap-2">
          <Button
            variant="outline-success"
            onClick={() => mark("done")}
            disabled={actLoading}
          >
            Đánh dấu hoàn thành
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => mark("undo")}
            disabled={actLoading}
          >
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
                  <a
                    href={primaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-primary"
                  >
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

      <h5 className="mb-3">Bài đánh giá</h5>
      {assessments.length === 0 ? (
        <div className="text-muted">Bài học này chưa có bài tập/quiz.</div>
      ) : (
        <div className="list-group">
          {assessments.map((a) => (
            <div
              key={a._id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <div className="fw-semibold">{a.title}</div>
                <small className="text-muted">
                  Loại: {a.assessmentType} • Hạn:{" "}
                  {a.dueAt ? new Date(a.dueAt).toLocaleString() : "—"}
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                {a.assessmentType === "ASSIGNMENT" && (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setAsmId(a._id)}
                  >
                    Nộp bài tập
                  </Button>
                )}
                {a.assessmentType === "QUIZ" && (
                  <Button
                    size="sm"
                    variant="outline-success"
                    onClick={() => setQuizId(a._id)}
                  >
                    Nộp quiz
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        {lesson?.course && (
          <Link
            to={`/learning/course/${lesson.course}`}
            className="btn btn-outline-secondary"
          >
            ⬅ Về outline khoá
          </Link>
        )}
      </div>

      {/* Modals */}
      <AssignmentSubmitModal
        show={!!asmId}
        assessmentId={asmId}
        onHide={() => {
          setAsmId(null);
          clearParam("assignment");
        }}
        onSubmitted={() => setMsg("Đã gửi bài tập.")}
      />
      <QuizSubmitModal
        show={!!quizId}
        assessmentId={quizId}
        onHide={() => {
          setQuizId(null);
          clearParam("quiz");
        }}
        onSubmitted={() => setMsg("Đã nộp quiz.")}
      />
    </div>
  );
}
