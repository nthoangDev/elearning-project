import { useEffect, useState } from 'react';
import { Card, Col, Row, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { authApis, endpoints } from '../../configs/Apis';

const ROLE_LABEL = { MAIN: 'Giảng viên chính', CO: 'Đồng giảng', TA: 'Trợ giảng' };
const THUMB_HEIGHT = 180;

function secondsToHms(totalSec = 0) {
  const s = Math.max(0, Number(totalSec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const mm = String(m).padStart(2, '0');
  return h ? `${h}h${mm}` : `${m} phút`;
}

export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const a = authApis();
      const res = await a.get(endpoints.instructorMyCourses, { params: { stats: 1 } });
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="mb-3">
        <h4>Khoá dạy của tôi</h4>
      </div>

      {loading && (
        <div className="d-flex align-items-center gap-2 text-muted mb-3">
          <Spinner animation="border" size="sm" /> Đang tải...
        </div>
      )}

      <Row>
        {!loading && courses.map(c => (
          <Col key={c._id} sm={6} md={4} lg={3} className="mb-3">
            <Card className="h-100">
              <div
                style={{
                  height: THUMB_HEIGHT,
                  backgroundColor: '#f8f9fa',
                  borderTopLeftRadius: '0.375rem',
                  borderTopRightRadius: '0.375rem',
                  overflow: 'hidden'
                }}
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted small">
                    Không có ảnh
                  </div>
                )}
              </div>

              <Card.Body className="d-flex flex-column">
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <Badge bg="secondary">{ROLE_LABEL[c.myRole] || c.myRole}</Badge>
                  {c.status && <Badge bg={c.status === 'PUBLISHED' ? 'success' : 'warning'}>{c.status}</Badge>}
                </div>

                <Card.Title className="text-truncate" title={c.title}>{c.title}</Card.Title>

                <div className="small text-muted mb-2">
                  {typeof c.ratingAvg === 'number' && (
                    <>
                      ★ {c.ratingAvg?.toFixed(1)} ({c.ratingCount || 0})
                      <span className="mx-2">•</span>
                    </>
                  )}
                  {c.lessons ?? 0} bài · {secondsToHms(c.totalDurationSec)}
                </div>

                <div className="mt-auto d-flex gap-2">
                  <Link className="btn btn-primary btn-sm" to={`/instructor/courses/${c._id}`}>
                    Quản lý nội dung
                  </Link>
                  {(c._id) && (
                    <Link
                      className="btn btn-outline-secondary btn-sm"
                      to={`/courses/${c._id}`}
                      target="_blank"
                    >
                      Xem trang khoá
                    </Link>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}

        {!loading && !courses.length && (
          <Col xs={12}><p className="text-muted">Chưa có khoá nào.</p></Col>
        )}
      </Row>
    </>
  );
}
