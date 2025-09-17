import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Accordion, Button, Spinner } from "react-bootstrap";
import Apis, { endpoints, authApis } from "../../configs/Apis";
import './CourseDetail.css';

function fmtMinutes(sec) {
  const s = Number(sec) || 0;
  if (!s) return "—";
  const m = Math.round(s / 60);
  return m ? `${m} phút` : `${s}s`;
}

function formatCurrency(n, currency = "VND") {
  const v = Number(n) || 0;
  try {
    return v.toLocaleString("vi-VN", { style: "currency", currency });
  } catch {
    return `${v.toLocaleString("vi-VN")} ${currency}`;
  }
}

export default function PublicCourseDetail() {
  const { idOrSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await Apis.get(endpoints.courseDetail(idOrSlug));
        if (!mounted) return;
        setCourse(res.data?.course || null);
        setSections(res.data?.sections || []);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setCourse(null);
          setSections([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [idOrSlug]);

  if (loading) return (
    <div className="course-detail-container">
      <div className="container loading-spinner">
        <Spinner animation="border" variant="primary" size="lg" />
      </div>
    </div>
  );

  if (!course) return (
    <div className="course-detail-container">
      <div className="container not-found">
        Không tìm thấy khóa học.
      </div>
    </div>
  );

  const addToCart = async () => {
    try {
      await authApis().post(endpoints.addToCart, { courseId: course._id, quantity: 1 });
      alert('Đã thêm vào giỏ hàng');
    } catch { alert('Không thêm được vào giỏ, hãy đăng nhập.'); }
  };

  const price = course.salePrice ?? course.price ?? 0;
  const hasSale = typeof course.salePrice === "number" && course.salePrice < (course.price || 0);

  return (
    <div className="course-detail-container">
      <div className="container">
        <div className="course-header">
          <div className="row g-0">
            <div className="col-lg-7 p-4">
              <h1 className="course-title">{course.title}</h1>

              <div className="instructor-info">
                {(course.instructors || []).map((t, i) => (
                  <div key={t._id || i} className="instructor-item">
                    <i className="bi bi-person-circle" />
                    <span>{t.fullName}</span>
                  </div>
                ))}
              </div>

              <div className="course-badges">
                <span className="custom-badge badge-level">
                  {course.level || "BEGINNER"}
                </span>
                {course.topic?.name && (
                  <span className="custom-badge badge-topic">
                    {course.topic.name}
                  </span>
                )}
              </div>

              <div className="course-description">
                {course.description}
              </div>
            </div>

            <div className="col-lg-5 p-4">
              {course.imageUrl && (
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="course-image w-100 mb-4"
                  style={{ objectFit: "cover", height: "240px" }}
                />
              )}

              <div className="pricing-card">
                {hasSale ? (
                  <div>
                    <div className="price-current">
                      {formatCurrency(course.salePrice, course.currency)}
                    </div>
                    <div className="price-original">
                      {formatCurrency(course.price, course.currency)}
                    </div>
                  </div>
                ) : (
                  <div className="price-current">
                    {formatCurrency(price, course.currency)}
                  </div>
                )}

                <div className="course-meta">
                  <div><strong>Ngôn ngữ:</strong> {course.language?.toUpperCase() || "VI"}</div>
                  <div><strong>Thời lượng:</strong> {course.durationLabel || "Tự học theo tiến độ"}</div>
                </div>

                <Button onClick={addToCart} variant="primary"  className="btn btn-purchase w-100">
                  <i className="bi bi-bag-plus me-2" /> Thêm vào giỏ
                </Button>
              </div>
            </div>
          </div>
        </div>

        <h2 className="content-section-title">Nội dung khóa học</h2>

        {sections.length === 0 ? (
          <div className="empty-content">
            Khóa học chưa có nội dung.
          </div>
        ) : (
          <Accordion defaultActiveKey="0" alwaysOpen className="custom-accordion">
            {sections.map((s, idx) => (
              <Accordion.Item eventKey={String(idx)} key={s._id}>
                <Accordion.Header>
                  <div className="d-flex align-items-center justify-content-between w-100 me-3">
                    <div className="d-flex align-items-center gap-3">
                      <span className="section-badge">
                        {s.sortOrder ?? (idx + 1)}
                      </span>
                      <span className="fw-bold">{s.title}</span>
                    </div>
                    <span className="lesson-count">
                      {(s.lessons || []).length} bài học
                    </span>
                  </div>
                </Accordion.Header>

                <Accordion.Body>
                  {(s.lessons || []).length === 0 ? (
                    <div className="empty-content">
                      Chưa có bài học.
                    </div>
                  ) : (
                    <div>
                      {s.lessons.map((l, li) => (
                        <div key={l._id} className="lesson-item">
                          <div className="lesson-info">
                            <span className="lesson-number">
                              {l.sortOrder ?? (li + 1)}.
                            </span>
                            <span className="lesson-title">{l.title}</span>
                            <span className="lesson-type">
                              {l.type || "VIDEO"}
                            </span>
                            {l.isFreePreview && (
                              <span className="lesson-preview">
                                Học thử
                              </span>
                            )}
                          </div>
                          <div className="lesson-duration">
                            {fmtMinutes(l.durationSec)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}