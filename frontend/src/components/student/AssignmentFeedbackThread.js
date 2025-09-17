import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Badge, Button, Form, ListGroup, Spinner, Alert } from "react-bootstrap";
import { authApis, endpoints } from "../../configs/Apis";

/**
 * UI xem phản hồi chấm điểm + thread trao đổi dưới bài tập
 * Props:
 *  - assessmentId (bắt buộc)
 */
export default function AssignmentFeedbackThread({ assessmentId }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // chỉ cần lần nộp mới nhất theo BE /thread
  const [submission, setSubmission] = useState(null); // { score, pass, status, feedback, graderUser, ... }
  const [comments, setComments] = useState([]);
  const [cmLoading, setCmLoading] = useState(false);
  const [cmErr, setCmErr] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const listRef = useRef(null);

  const grader = submission?.graderUser?.fullName || submission?.graderUser?.email || "";

  // Load thread: GET /api/student/assessments/:assessmentId/thread
  const loadThread = async () => {
    setLoading(true);
    setErr("");
    try {
      const url =
        endpoints?.assessmentThread?.(assessmentId) ||
        `/api/student/assessments/${assessmentId}/thread`;
      const r = await authApis().get(url);
      const sub = r?.data?.submission || null;
      const cmts = r?.data?.comments || [];
      setSubmission(sub);
      setComments(Array.isArray(cmts) ? cmts : []);
      // auto scroll xuống cuối
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (e) {
      setErr(e?.response?.data?.message || "Không tải được phản hồi");
      setSubmission(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  // Post comment: POST /api/student/submissions/:submissionId/comments
  const postComment = async (e) => {
    e?.preventDefault?.();
    if (!newMsg.trim() || !submission?._id) return;
    const payload = { message: newMsg.trim() };

    try {
      const url =
        endpoints?.submissionComments?.(submission._id) ||
        `/api/student/submissions/${submission._id}/comments`;
      const r = await authApis().post(url, payload);

      // BE trả về object comment mới (theo controller addSubmissionComment)
      const added = r?.data;
      if (added && (added.createdAt || added.message)) {
        setComments((prev) => [...prev, { ...added, _id: added._id || `local_${Date.now()}` }]);
      } else {
        // fallback local
        setComments((prev) => [
          ...prev,
          {
            _id: `local_${Date.now()}`,
            user: { fullName: "Bạn" },
            message: newMsg.trim(),
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      setNewMsg("");
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 30);
    } catch (e) {
      alert(e?.response?.data?.message || "Gửi bình luận thất bại");
    }
  };

  useEffect(() => {
    if (!assessmentId) return;
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const statusBadge = useMemo(() => {
    if (!submission?.status) return null;
    const bg =
      submission.status === "GRADED" ? "success" :
      submission.status === "RETURNED" ? "info" :
      submission.status === "SUBMITTED" ? "warning" : "secondary";
    return <Badge bg={bg}>{submission.status}</Badge>;
  }, [submission?.status]);

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0">Phản hồi & Thảo luận</h5>
            {statusBadge}
          </div>
          {loading && (
            <small className="text-muted">
              <Spinner size="sm" animation="border" className="me-1" />
              Đang tải dữ liệu…
            </small>
          )}
        </div>
      </Card.Header>

      <Card.Body>
        {err && <Alert variant="danger">{err}</Alert>}

        {!err && !loading && !submission && (
          <Alert variant="info" className="mb-0">
            Bạn chưa có bài nộp cho bài này. Hãy nộp bài để nhận phản hồi.
          </Alert>
        )}

        {!err && !loading && submission && (
          <>
            {/* Thông tin chấm điểm + feedback */}
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div>
                  <div className="text-muted small">Điểm</div>
                  <div className="fw-bold fs-5">
                    {typeof submission.score === "number" ? `${submission.score}%` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted small">Kết quả</div>
                  <div>
                    {submission.pass === true && <Badge bg="success">ĐẠT</Badge>}
                    {submission.pass === false && <Badge bg="danger">CHƯA ĐẠT</Badge>}
                    {typeof submission.pass !== "boolean" && <span className="text-muted">Chưa có</span>}
                  </div>
                </div>
                <div>
                  <div className="text-muted small">Chấm bởi</div>
                  <div>{grader || <span className="text-muted">—</span>}</div>
                </div>
                <div>
                  <div className="text-muted small">Thời điểm</div>
                  <div>
                    {submission.gradedAt
                      ? new Date(submission.gradedAt).toLocaleString()
                      : submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString()
                        : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback của GV */}
            <Card className="mb-3 border-0 bg-light">
              <Card.Body>
                <div className="d-flex align-items-start gap-2">
                  <i className="bi bi-chat-left-quote fs-5 text-primary mt-1"></i>
                  <div>
                    <div className="fw-semibold mb-1">Nhận xét của giáo viên</div>
                    <div className="text-dark">
                      {submission.feedback?.trim()
                        ? submission.feedback
                        : <span className="text-muted">Chưa có nhận xét.</span>}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Thread bình luận */}
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Thảo luận</div>
                {cmLoading && <small className="text-muted"><Spinner size="sm" /> Đang tải…</small>}
              </div>

              {cmErr && <Alert variant="warning">{cmErr}</Alert>}

              <div
                ref={listRef}
                style={{ maxHeight: 320, overflowY: "auto" }}
                className="border rounded p-2 bg-white"
              >
                {(!comments || comments.length === 0) ? (
                  <div className="text-muted small">Chưa có bình luận nào.</div>
                ) : (
                  <ListGroup variant="flush">
                    {comments.map((c) => (
                      <ListGroup.Item key={c._id || c.createdAt} className="border-0 px-0 py-2">
                        <div className="d-flex align-items-start gap-2">
                          <div className="flex-shrink-0 rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                            <i className="bi bi-person"></i>
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-semibold">
                                {c.user?.fullName || c.user?.email || "Người dùng"}
                              </span>
                              <small className="text-muted">
                                {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                              </small>
                            </div>
                            <div>{c.message}</div>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            </div>

            {/* Form gửi bình luận */}
            <Form onSubmit={postComment} className="d-flex align-items-center gap-2">
              <Form.Control
                placeholder="Nhập bình luận để trao đổi với giáo viên…"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={!newMsg.trim()}>
                Gửi
              </Button>
            </Form>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
