import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Row, Col, Badge, Button } from "react-bootstrap";
import { authApis, endpoints } from "../../configs/Apis";

const api = () => authApis();

export default function LearningHome() {
  const nav = useNavigate();
  const [courses, setCourses] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const myCoursesUrl = endpoints?.myEnrolledCourses || "/api/student/my-courses";
        const deadlinesUrl  = (endpoints?.studentDeadlines && endpoints.studentDeadlines("withinDays=7"))
                            || "/api/student/deadlines?withinDays=7";

        const [c1, c2] = await Promise.all([api().get(myCoursesUrl), api().get(deadlinesUrl)]);
        if (!alive) return;

        setCourses(Array.isArray(c1.data) ? c1.data : (c1.data?.items || []));
        setDeadlines(Array.isArray(c2.data) ? c2.data : (c2.data?.items || []));
      } catch (e) {
        if (alive) {
          setCourses([]);
          setDeadlines([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const pct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  return (
    <div>
      <h3 className="mb-4">Khoá học của tôi</h3>

      {loading && <div className="text-muted">Đang tải…</div>}

      {!loading && courses.length === 0 && (
        <div className="text-muted">Bạn chưa có khoá nào. Hãy <Link to="/courses">khám phá khoá học</Link>.</div>
      )}

      <Row xs={1} md={2} lg={3} className="g-4">
        {courses.map((en) => (
          <Col key={en._id}>
            <Card className="h-100 shadow-sm">
              {en.course?.imageUrl && (
                <Card.Img variant="top" src={en.course.imageUrl} alt={en.course?.title} style={{objectFit:"cover", height:160}}/>
              )}
              <Card.Body>
                <Card.Title className="fw-bold">{en.course?.title}</Card.Title>
                <div className="d-flex align-items-center justify-content-between mt-2">
                  <div className="w-100 me-3">
                    <div className="progress" style={{height:10}}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{width: `${pct(en.progressPct)}%`}}
                        aria-valuenow={pct(en.progressPct)}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                    <small className="text-muted">{pct(en.progressPct)}% hoàn thành</small>
                  </div>
                  {en.completed ? <Badge bg="success">Hoàn tất</Badge> : <Badge bg="secondary">Đang học</Badge>}
                </div>
                <div className="mt-3 d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    onClick={() => nav(`/learning/course/${en.course?._id}`)}
                  >
                    Vào học
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => nav(`/courses/${en.course?._id}`)}
                  >
                    Chi tiết
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="d-flex align-items-center mt-5 mb-2">
        <h4 className="mb-0">Deadline sắp tới</h4>
        <Button size="sm" variant="link" className="ms-2" onClick={() => nav("/learning/deadlines")}>
          Xem tất cả
        </Button>
      </div>

      {deadlines.length === 0 ? (
        <div className="text-muted">Không có deadline trong 7 ngày tới.</div>
      ) : (
        <div className="list-group">
          {deadlines.map((d) => (
            <div key={d._id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-semibold">{d.title}</div>
                <small className="text-muted">
                  Loại: {d.type} • Hạn: {d.dueAt ? new Date(d.dueAt).toLocaleString() : "—"}
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                {d.submitted ? <Badge bg="primary">Đã nộp</Badge> : <Badge bg="warning" text="dark">Chưa nộp</Badge>}
                {d.graded && <Badge bg="success">Đã chấm</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
