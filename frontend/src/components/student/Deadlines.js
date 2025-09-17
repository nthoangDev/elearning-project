import { useEffect, useMemo, useRef, useState } from "react";
import { authApis, endpoints } from "../../configs/Apis";
import {
  Badge,
  Button,
  Card,
  Row,
  Col,
  Form,
  Spinner,
  Alert,
  Container,
  Stack,
  ListGroup
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";

function formatDue(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  try {
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function diffHuman(iso) {
  if (!iso) return "";
  const now = Date.now();
  const due = new Date(iso).getTime();
  const diff = due - now;
  const abs = Math.abs(diff);

  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  const span =
    mins < 60 ? `${mins} phút` :
      hours < 24 ? `${hours} giờ` :
        `${days} ngày`;

  if (diff > 0) return `còn ${span}`;
  return `trễ ${span}`;
}

export default function Deadlines() {
  const nav = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);

  // đọc ?focus=ID nếu có
  const params = new URLSearchParams(location.search);
  const focusId = params.get("focus") || "";

  const focusRef = useRef(null);

  const load = async (d) => {
    setLoading(true);
    try {
      const url = endpoints?.studentDeadlines
        ? endpoints.studentDeadlines(d)
        : `/api/student/deadlines?withinDays=${d}`;
      const r = await authApis().get(url);
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items || []);
      // sắp xếp gần hạn trước
      arr.sort((a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0));
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // sau khi load xong, nếu có focus -> cuộn tới + highlight
  useEffect(() => {
    const t = setTimeout(() => {
      if (focusRef.current) {
        focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [items, focusId]);

  const cntUnsubmitted = useMemo(
    () => items.filter((d) => !d.submitted).length,
    [items]
  );

  const cntOverdue = useMemo(
    () => items.filter((d) => {
      const overdue = d.onTime === false || (d.dueAt && new Date(d.dueAt).getTime() < Date.now() && !d.submitted);
      return overdue;
    }).length,
    [items]
  );

  const openAssessment = async (item) => {
    try {
      // Chuẩn hóa type
      let type = (item.type || item.assessmentType || "").toUpperCase();
      if (type !== "QUIZ" && type !== "ASSIGNMENT") type = "ASSIGNMENT";

      // Lấy lessonId từ item nếu có
      let lessonId =
        item.lesson?._id || item.lesson || item.lessonId || item.lesson_id;

      // Nếu chưa có -> gọi detail để lấy lesson
      if (!lessonId) {
        const r = await authApis().get(
          endpoints?.assessmentDetail?.(item._id) || `/api/student/assessments/${item._id}`
        );
        lessonId =
          r?.data?.lesson?._id || r?.data?.lesson || r?.data?.lessonId;
        if (!type && r?.data?.assessmentType)
          type = String(r.data.assessmentType).toUpperCase();
      }

      // Vẫn không có -> fallback nhẹ: về trang deadlines với focus
      if (!lessonId) {
        nav(`/learning/deadlines?focus=${encodeURIComponent(item._id)}`);
        return;
      }

      // Điều hướng đúng lesson:
      // - Assignment:
      //    + Nếu CHƯA nộp -> mở modal nộp: ?assignment=<id>
      //    + Nếu ĐÃ nộp -> mở thẳng khung "Xem kết quả": ?view=<id>
      // - Quiz: giữ nguyên modal quiz (?quiz=<id>)
      const isSubmitted = !!item.submitted;
      if (type === "ASSIGNMENT") {
        const query = isSubmitted
          ? `view=${encodeURIComponent(item._id)}`
          : `assignment=${encodeURIComponent(item._id)}`;
        nav(`/learning/lesson/${lessonId}?${query}`);
      } else {
        // QUIZ
        nav(`/learning/lesson/${lessonId}?quiz=${encodeURIComponent(item._id)}`);
      }
    } catch (e) {
      nav(`/learning/deadlines?focus=${encodeURIComponent(item._id)}`);
    }
  };

  return (
    <Container fluid className="px-4">
      {/* Header Section */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="py-4">
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center gap-3">
                <div>
                  <i className="bi bi-calendar-check text-primary fs-2"></i>
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-dark">Deadline sắp tới</h2>
                  <p className="text-muted mb-0 fs-6">Quản lý và theo dõi các bài tập, quiz cần hoàn thành</p>
                </div>
                {cntOverdue > 0 && (
                  <Badge bg="danger" className="px-3 py-2 fs-6 ms-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {cntOverdue} quá hạn
                  </Badge>
                )}
                {cntUnsubmitted > 0 && (
                  <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 ms-1">
                    <i className="bi bi-clock me-1"></i>
                    {cntUnsubmitted} chưa nộp
                  </Badge>
                )}
              </div>
            </Col>
            <Col md={4} className="text-md-end">
              <Stack direction="horizontal" gap={2} className="justify-content-md-end">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-funnel text-muted"></i>
                  <Form.Select
                    size="sm"
                    value={days}
                    onChange={(e) => setDays(+e.target.value)}
                    style={{ width: "160px" }}
                  >
                    <option value={7}>Trong 7 ngày</option>
                    <option value={14}>Trong 14 ngày</option>
                    <option value={30}>Trong 30 ngày</option>
                  </Form.Select>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => load(days)}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner size="sm" className="me-1" />
                  ) : (
                    <i className="bi bi-arrow-clockwise me-1" />
                  )}
                  Tải lại
                </Button>
              </Stack>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-4">
            <Spinner animation="border" variant="primary" className="mb-2" />
            <p className="text-muted mb-0">Đang tải dữ liệu...</p>
          </Card.Body>
        </Card>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <Alert variant="info" className="border-0 shadow-sm">
          <div className="d-flex align-items-center">
            <i className="bi bi-info-circle fs-4 me-3"></i>
            <div>
              <h6 className="mb-1">Không có deadline</h6>
              <p className="mb-0">Không có deadline nào trong {days} ngày tới.</p>
            </div>
          </div>
        </Alert>
      )}

      {/* Deadlines List */}
      {!loading && items.length > 0 && (
        <Card className="border-0 shadow-sm">
          <ListGroup variant="flush">
            {items.map((d) => {
              const overdue = d.onTime === false || (d.dueAt && new Date(d.dueAt).getTime() < Date.now() && !d.submitted);
              const isFocus = focusId && d._id === focusId;
              const isUrgent = !d.submitted && d.dueAt && (new Date(d.dueAt).getTime() - Date.now() < 86400000);

              return (
                <ListGroup.Item
                  key={d._id}
                  ref={isFocus ? focusRef : undefined}
                  className={`border-0 py-4 ${isFocus ? 'bg-primary bg-opacity-10' : ''}`}
                  style={{
                    borderLeft: isFocus
                      ? "4px solid var(--bs-primary)"
                      : overdue
                        ? "4px solid var(--bs-danger)"
                        : isUrgent
                          ? "4px solid var(--bs-warning)"
                          : "4px solid transparent"
                  }}
                >
                  <Row className="align-items-center">
                    {/* Icon */}
                    <Col xs={1} className="text-center">
                      <div className="position-relative">
                        <i className={`bi ${d.type === "QUIZ" ? "bi-patch-question-fill" : "bi-file-text-fill"} fs-4 ${d.type === "QUIZ" ? "text-info" : "text-secondary"}`}></i>
                        {(overdue || isUrgent) && (
                          <Badge
                            bg={overdue ? "danger" : "warning"}
                            className="position-absolute top-0 start-100 translate-middle p-1 rounded-pill"
                          >
                            <span className="visually-hidden">Priority</span>
                          </Badge>
                        )}
                      </div>
                    </Col>

                    {/* Title & Details */}
                    <Col md={6} lg={5}>
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h6 className="mb-0 fw-bold text-dark">{d.title}</h6>
                          <Badge
                            bg={d.type === "QUIZ" ? "info" : "secondary"}
                            className="fs-7"
                          >
                            {d.type === "QUIZ" ? "Quiz" : "Assignment"}
                          </Badge>
                        </div>
                        <div className="text-muted small">
                          <i className="bi bi-calendar3 me-1"></i>
                          Hạn: <span className="fw-semibold">{formatDue(d.dueAt)}</span>
                          <span className="mx-2">•</span>
                          <Badge
                            bg={overdue ? "danger" : isUrgent ? "warning" : "success"}
                            text={overdue || isUrgent ? "dark" : "light"}
                            className="fs-7"
                          >
                            <i className={`bi ${overdue ? "bi-clock-history" : "bi-clock"} me-1`}></i>
                            {diffHuman(d.dueAt)}
                          </Badge>
                        </div>
                      </div>
                    </Col>

                    {/* Status */}
                    <Col md={3} lg={4} className="text-center">
                      <Stack direction="horizontal" gap={2} className="justify-content-center flex-wrap">
                        {d.submitted ? (
                          <Badge bg="success" className="px-3 py-1">
                            <i className="bi bi-check-circle me-1"></i>
                            Đã nộp
                          </Badge>
                        ) : (
                          <Badge bg="warning" text="dark" className="px-3 py-1">
                            <i className="bi bi-hourglass-split me-1"></i>
                            Chưa nộp
                          </Badge>
                        )}
                        {d.graded && (
                          <Badge bg="primary" className="px-3 py-1">
                            <i className="bi bi-clipboard-check me-1"></i>
                            Đã chấm
                          </Badge>
                        )}
                      </Stack>
                    </Col>

                    {/* Action */}
                    <Col md={2} lg={2} className="text-end">
                      <Button
                        variant={d.submitted ? "outline-secondary" : overdue ? "danger" : "primary"}
                        size="sm"
                        onClick={() => openAssessment(d)}
                        className="fw-semibold px-3"
                      >
                        <i className={`bi ${d.submitted ? "bi-eye" : "bi-pencil-square"} me-1`}></i>
                        {d.submitted
                          ? "Xem"
                          : ((d.type || d.assessmentType) === "QUIZ" ? "Làm ngay" : "Nộp ngay")}
                      </Button>
                    </Col>
                  </Row>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Card>
      )}
    </Container>
  );
}
