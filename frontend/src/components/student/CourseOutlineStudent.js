import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, Button, ListGroup, Badge } from "react-bootstrap";
import { authApis, endpoints } from "../../configs/Apis";

const api = () => authApis();

export default function CourseOutlineStudent() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const [outline, setOutline] = useState([]);
  const [progress, setProgress] = useState({ progressPct: 0, completed: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const outlineUrl = endpoints?.studentCourseOutline?.(courseId) || `/api/student/courses/${courseId}/outline`;
        const progressUrl = endpoints?.studentCourseProgress?.(courseId) || `/api/student/courses/${courseId}/progress`;

        const [o, p] = await Promise.all([api().get(outlineUrl), api().get(progressUrl)]);
        if (!alive) return;

        setOutline(Array.isArray(o.data) ? o.data : (o.data?.items || []));
        setProgress(p.data || { progressPct: 0, completed: false });
      } catch {
        if (alive) {
          setOutline([]);
          setProgress({ progressPct: 0, completed: false });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [courseId]);

  const pct = Math.max(0, Math.min(100, Math.round(Number(progress.progressPct) || 0)));

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Lộ trình học</h3>
        <div className="d-flex align-items-center gap-3">
          <div style={{minWidth: 220}}>
            <div className="progress" style={{height: 10}}>
              <div className="progress-bar" style={{width: `${pct}%`}} />
            </div>
            <small className="text-muted">{pct}% hoàn thành</small>
          </div>
          {progress.completed && <Badge bg="success">Hoàn tất khoá</Badge>}
        </div>
      </div>

      {loading && <div className="text-muted">Đang tải…</div>}

      {outline.map((sec) => (
        <Card className="mb-3" key={sec._id}>
          <Card.Body>
            <Card.Title className="fw-bold">{sec.title}</Card.Title>
            {sec.summary && <Card.Text className="text-muted">{sec.summary}</Card.Text>}
            <ListGroup variant="flush">
              {(sec.lessons || []).map((l) => (
                <ListGroup.Item key={l._id} className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{l.title}</div>
                    <small className="text-muted">Loại: {l.type}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {l.completed ? <Badge bg="success">Đã hoàn thành</Badge> : <Badge bg="secondary">Chưa xong</Badge>}
                    <Button variant="outline-primary" size="sm" onClick={() => nav(`/learning/lesson/${l._id}`)}>
                      Vào học
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      ))}

      <div className="mt-3">
        <Link to="/learning" className="btn btn-outline-secondary">⬅ Về Học tập</Link>
      </div>
    </div>
  );
}
