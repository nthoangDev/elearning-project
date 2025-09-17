import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Apis, { endpoints } from "../../configs/Apis";
import { Form, Button, Row, Col, Card, Badge, Spinner, Pagination, InputGroup } from "react-bootstrap";
import { Search, Tags, CashCoin, StarFill } from 'react-bootstrap-icons';
import './CourseList.css';

// Helper
const fmtPrice = (n, c = "VND") =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", { style: "currency", currency: c })
    : "Miễn phí";

const sortOptions = [
  { value: "popular", label: "Phổ biến" },
  { value: "rating_desc", label: "Điểm cao nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "newest", label: "Mới nhất" },
];

export default function PublicCourseList() {
  const [sp, setSp] = useSearchParams();

  // URL -> state
  const q = sp.get("q") || "";
  const topic = sp.get("topic") || "";
  const minPrice = sp.get("minPrice") || "";
  const maxPrice = sp.get("maxPrice") || "";
  const sort = sp.get("sort") || "popular";
  const page = Number(sp.get("page") || 1);
  const pageSize = Number(sp.get("pageSize") || 12);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const params = useMemo(() => {
    const p = { page, pageSize, sort };
    if (q.trim()) p.q = q.trim();
    if (topic.trim()) p.topic = topic.trim();
    if (minPrice !== "") p.minPrice = Number(minPrice);
    if (maxPrice !== "") p.maxPrice = Number(maxPrice);
    return p;
  }, [q, topic, minPrice, maxPrice, sort, page, pageSize]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await Apis.get(endpoints.listCourses, { params });
      const data = res.data;
      console.log(res)
      const list = Array.isArray(data) ? data : data.items || [];
      const count = Array.isArray(data) ? list.length : data.total ?? list.length;
      setItems(list);
      setTotal(count);
    } catch (e) {
      console.error("Load courses error:", e?.response?.data || e?.message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [q, topic, minPrice, maxPrice, sort, page, pageSize]);

  const updateSearchParams = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === "" || v == null) next.delete(k);
      else next.set(k, String(v));
    });
    if ("q" in patch || "topic" in patch || "minPrice" in patch || "maxPrice" in patch || "sort" in patch) {
      next.set("page", "1");
    }
    setSp(next, { replace: false });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // RENDER COMPONENT
  return (
    // NEW: Added custom class for page-specific styling
    <div className="public-course-list container py-4">
      <header className="page-header mb-4">
        <h1 className="page-title">Khám Phá Các Khóa Học</h1>
        <p className="page-subtitle">Tìm kiếm, lọc và sắp xếp để tìm khóa học phù hợp nhất với bạn.</p>
      </header>

      {/* Filters */}
      {/* NEW: Changed Card to a form with custom class */}
      <Form className="course-filters mb-4">
        <Row className="g-2 align-items-center">
          <Col md={5}>
            <InputGroup>
              <InputGroup.Text><Search /></InputGroup.Text>
              <Form.Control
                placeholder="Tìm kiếm theo từ khóa, giảng viên…"
                defaultValue={q}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateSearchParams({ q: e.currentTarget.value });
                }}
              />
            </InputGroup>
          </Col>
          <Col md={2}>
            <InputGroup>
                <InputGroup.Text><CashCoin /></InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Giá từ"
                  defaultValue={minPrice}
                  onBlur={(e) => updateSearchParams({ minPrice: e.target.value })}
                />
            </InputGroup>
          </Col>
          <Col md={2}>
            <Form.Control
              type="number"
              placeholder="Giá đến"
              defaultValue={maxPrice}
              onBlur={(e) => updateSearchParams({ maxPrice: e.target.value })}
            />
          </Col>
          <Col md={3}>
            <Form.Select
              defaultValue={sort}
              onChange={(e) => updateSearchParams({ sort: e.target.value })}
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </Form>

      {/* Results */}
      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : items.length === 0 ? (
        <Card body className="text-center text-muted not-found-card">
          Không tìm thấy khóa học phù hợp.
        </Card>
      ) : (
        <>
          <Row className="g-4"> {/* CHANGED: Increased gutter spacing */}
            {items.map((c) => {
              const instructors = (c.instructors || [])
                .map((i) => i?.user?.fullName)
                .filter(Boolean)
                .join(", ");
              const priceLabel = c.salePrice != null ? (
                <>
                  <span className="price-original me-2">{fmtPrice(c.price, c.currency)}</span>
                  <span className="price-sale">{fmtPrice(c.salePrice, c.currency)}</span>
                </>
              ) : (
                <span className="price-final">{fmtPrice(c.price, c.currency)}</span>
              );

              return (
                <Col key={c._id} xs={12} sm={6} md={4} lg={3}>
                  {/* NEW: Added custom class to Card */}
                  <Card className="h-100 course-card">
                    <Link to={`/courses/${c.slug || c._id}`} className="course-card__image-link">
                      <Card.Img
                        variant="top"
                        src={c.imageUrl || 'https://via.placeholder.com/400x225?text=No+Image'}
                        alt={c.title}
                        className="course-card__image"
                      />
                    </Link>
                    <Card.Body className="d-flex flex-column p-3">
                      {c.topic && <Badge pill bg="light" text="dark" className="course-card__topic mb-2">{c.topic.name}</Badge>}
                      <Link to={`/courses/${c.slug || c._id}`} className="text-decoration-none course-card__title-link">
                        <Card.Title as="h6" className="course-card__title">{c.title}</Card.Title>
                      </Link>
                      {instructors && (
                        <div className="course-card__instructor mb-2">{instructors}</div>
                      )}
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <Badge className="course-card__rating">
                          <StarFill className="me-1" /> {Number(c.ratingAvg || 0).toFixed(1)}
                        </Badge>
                        <span className="course-card__rating-count">({c.ratingCount || 0} đánh giá)</span>
                      </div>
                      <div className="mt-auto">
                        <div className="course-card__price mb-3">{priceLabel}</div>
                        <Link to={`/courses/${c.slug || c._id}`} className="btn btn-primary w-100 course-card__button">
                          Xem chi tiết
                        </Link>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-5">
                {/* NEW: Applied custom class */}
              <Pagination className="course-pagination">
                <Pagination.First disabled={page <= 1} onClick={() => updateSearchParams({ page: 1 })} />
                <Pagination.Prev disabled={page <= 1} onClick={() => updateSearchParams({ page: page - 1 })} />
                {/* Simplified for brevity, you can add more page numbers here if needed */}
                <Pagination.Item active>{page}</Pagination.Item>
                <Pagination.Next disabled={page >= totalPages} onClick={() => updateSearchParams({ page: page + 1 })} />
                <Pagination.Last disabled={page >= totalPages} onClick={() => updateSearchParams({ page: totalPages })} />
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}