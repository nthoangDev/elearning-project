import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Form, Row, Col, Badge } from 'react-bootstrap';
import { authApis, endpoints } from '../../configs/Apis';

export default function LessonForm({
  show,
  courseId,
  sectionId,
  lesson,
  onHide,
  onSaved
}) {
  const a = authApis();
  const editing = !!lesson;

  // Danh sách chương & trạng thái tải
  const [sections, setSections] = useState([]);
  const [loadingSecs, setLoadingSecs] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    type: 'VIDEO',
    section: '',
    contentText: '',
    durationSec: '',
    isFreePreview: false,
    sortOrder: 1,
    resourceUrls: ''
  });

  // Upload files
  const [files, setFiles] = useState([]);

  const sortSecs = (arr = []) => [...arr].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const ensureSectionSelected = (list) => {
    setForm((prev) => ({
      ...prev,
      section: prev.section || String(sectionId || (list[0]?._id || ''))
    }));
  };

  const pullSections = async () => {
    setLoadingSecs(true);
    try {
      const res = await a.get(endpoints.sectionsByCourse(courseId));
      const arr = Array.isArray(res.data) ? res.data : [];
      const list = sortSecs(arr);
      setSections(list);
      ensureSectionSelected(list);
    } catch (e) {
      console.error('Load sections failed:', e?.response?.status, e?.response?.data || e?.message);
      setSections([]);
    } finally {
      setLoadingSecs(false);
    }
  };

  useEffect(() => {
    if (editing) {
      // ✅ Prefill URL hiện có để người dùng có thể thêm/sửa/xoá ngay trong textarea
      const urlsFromResources = Array.isArray(lesson?.resources)
        ? lesson.resources.map((r) => r?.url).filter(Boolean).join('\n')
        : '';
      setForm({
        title: lesson.title || '',
        type: lesson.type || 'VIDEO',
        section: String(lesson.section || sectionId || ''),
        contentText: lesson.contentText || '',
        durationSec: typeof lesson.durationSec === 'number' ? lesson.durationSec : '',
        isFreePreview: !!lesson.isFreePreview,
        sortOrder: lesson.sortOrder || 1,
        resourceUrls: urlsFromResources
      });
    } else {
      setForm({
        title: '',
        type: 'VIDEO',
        section: String(sectionId || ''),
        contentText: '',
        durationSec: '',
        isFreePreview: false,
        sortOrder: 1,
        resourceUrls: ''
      });
    }
    setFiles([]);
  }, [editing, lesson, sectionId, show]);

  useEffect(() => {
    if (!show || !courseId) return;
    pullSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, courseId]);

  const canSubmit = useMemo(
    () => !loadingSecs && sections.length > 0 && !!form.section,
    [loadingSecs, sections, form.section]
  );

  // Submit
  const submit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('type', form.type);
      fd.append('contentText', form.contentText || '');

      const duration = String(form.durationSec ?? '').trim();
      if (duration !== '') fd.append('durationSec', String(Math.max(0, Number(duration) || 0)));

      fd.append('isFreePreview', form.isFreePreview ? '1' : '0');
      fd.append('sortOrder', String(Math.max(1, Number(form.sortOrder) || 1)));
      fd.append('section', form.section);

      // ✅ Khi EDIT: LUÔN gửi resourceUrls (kể cả rỗng) để BE hiểu là "replace-all theo textarea"
      // ✅ Khi CREATE: chỉ gửi nếu có nhập để tránh tạo rỗng không cần thiết
      if (editing) {
        fd.append('resourceUrls', (form.resourceUrls ?? '').replace(/\r\n/g, '\n'));
      } else {
        const resourceUrls = (form.resourceUrls || '').trim();
        if (resourceUrls) fd.append('resourceUrls', resourceUrls.replace(/\r\n/g, '\n'));
      }

      for (const f of files) fd.append('files', f);

      if (editing) {
        // PUT /api/instructor/lessons/:lessonId
        await a.put(endpoints.lessonById(lesson._id), fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // POST /api/instructor/courses/:courseId/sections/:sectionId/lessons
        await a.post(endpoints.lessonsBySection(courseId, form.section), fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      onHide?.();
      onSaved?.();
    } catch (err) {
      console.error('Submit lesson error:', err?.response?.status, err?.response?.data || err?.message);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered >
      <Form onSubmit={submit}>
        {/* Header */}
        <Modal.Header closeButton className="border-0 pb-0">
          <div className="w-100 d-flex justify-content-between align-items-center">
            <h5 className="mb-1">
              <i className="bi bi-play-circle me-2" />
              {editing ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
            </h5>
            <div>
              {sections.length ? (
                <Badge bg="success" pill>
                  <i className="bi bi-check-circle me-1" />
                  Sẵn sàng tạo bài học
                </Badge>
              ) : loadingSecs ? (
                <Badge bg="secondary" pill>
                  <i className="bi bi-arrow-repeat me-1" />
                  Đang tải chương...
                </Badge>
              ) : (
                <Badge bg="warning" text="dark" pill>
                  <i className="bi bi-exclamation-triangle me-1" />
                  Chưa có chương nào
                </Badge>
              )}
            </div>
          </div>
        </Modal.Header>

        {/* Body */}
        <Modal.Body>
          <div className="p-1">
            <Row className="g-3">
              {/* Main column */}
              <Col lg={8}>
                {/* Card: Thông tin cơ bản */}
                <div className="border rounded-3 p-3 mb-3">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-info-circle me-2" />
                    <h6 className="mb-0">Thông tin cơ bản</h6>
                  </div>

                  <Form.Group className="mb-3" controlId="lf-title">
                    <Form.Label>
                      Tiêu đề bài học <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      required
                      placeholder="Nhập tiêu đề bài học"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </Form.Group>

                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="lf-type">
                        <Form.Label>
                          Loại bài học <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          value={form.type}
                          onChange={(e) => setForm({ ...form, type: e.target.value })}
                        >
                          <option value="VIDEO">VIDEO</option>
                          <option value="DOCUMENT">DOCUMENT</option>
                          <option value="QUIZ">QUIZ</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="lf-section">
                        <Form.Label>
                          Thuộc chương <span className="text-danger">*</span>
                        </Form.Label>
                        {loadingSecs ? (
                          <Form.Control disabled placeholder="Đang tải danh sách chương..." />
                        ) : sections.length ? (
                          <Form.Select
                            required
                            value={form.section}
                            onChange={(e) => setForm({ ...form, section: e.target.value })}
                          >
                            {sections.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.title}
                              </option>
                            ))}
                          </Form.Select>
                        ) : (
                          <Form.Control disabled placeholder="Chưa có chương — hãy tạo trước" />
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mt-3" controlId="lf-content">
                    <Form.Label>Mô tả / Ghi chú</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Mô tả nội dung, ghi chú cho bài học này..."
                      value={form.contentText}
                      onChange={(e) => setForm({ ...form, contentText: e.target.value })}
                    />
                  </Form.Group>
                </div>

                {/* Card: Tài nguyên bài học */}
                <div className="border rounded-3 p-3 mb-3">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-folder me-2" />
                    <h6 className="mb-0">Tài nguyên bài học</h6>
                  </div>

                  <Form.Group className="mb-3" controlId="lf-resourceUrls">
                    <Form.Label>URL tài nguyên</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Mỗi dòng một URL... (YouTube, PDF, ảnh, HLS, ...)"
                      value={form.resourceUrls}
                      onChange={(e) => setForm({ ...form, resourceUrls: e.target.value })}
                    />
                    <div className="small text-muted mt-2">
                      <div className="fw-semibold">Ví dụ URL hỗ trợ:</div>
                      <div className="d-flex flex-column">
                        <span>
                          <i className="bi bi-play-btn me-1" />
                          https://youtu.be/abc123
                        </span>
                        <span>
                          <i className="bi bi-file-earmark-pdf me-1" />
                          https://cdn.site.com/files/intro.pdf
                        </span>
                        <span>
                          <i className="bi bi-image me-1" />
                          https://images.example.com/diagram.png
                        </span>
                      </div>
                    </div>
                  </Form.Group>

                  <div className="text-center text-muted my-2">— hoặc —</div>

                  <Form.Group controlId="lf-files">
                    <Form.Label>Tải lên tệp từ máy tính</Form.Label>
                    <Form.Control
                      type="file"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      accept="video/*,application/pdf,image/*,audio/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,text/markdown"
                    />
                    <div className="small text-muted mt-1">
                      <i className="bi bi-cloud-upload me-1" />
                      Chọn nhiều tệp (tối đa ~50MB mỗi tệp). Hỗ trợ: Video, PDF, Ảnh, Audio, Word, Text...
                    </div>
                  </Form.Group>
                </div>

                {/* Card: Cài đặt bài học */}
                <div className="border rounded-3 p-3">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-gear me-2" />
                    <h6 className="mb-0">Cài đặt bài học</h6>
                  </div>

                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="lf-duration">
                        <Form.Label>Thời lượng (giây)</Form.Label>
                        <Form.Control
                          type="number"
                          min={0}
                          placeholder="0"
                          value={form.durationSec}
                          onChange={(e) => setForm({ ...form, durationSec: e.target.value })}
                        />
                        <div className="small text-muted">Ví dụ: 300 = 5 phút</div>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="lf-sort">
                        <Form.Label>Thứ tự</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          value={form.sortOrder}
                          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mt-3" controlId="lf-free">
                    <Form.Label>Cho phép học thử</Form.Label>
                    <Form.Select
                      value={form.isFreePreview ? '1' : '0'}
                      onChange={(e) => setForm({ ...form, isFreePreview: e.target.value === '1' })}
                    >
                      <option value="0">Không cho phép</option>
                      <option value="1">Cho phép xem trước</option>
                    </Form.Select>
                  </Form.Group>
                </div>
              </Col>

              {/* Sidebar */}
              <Col lg={4}>
                {/* Tài nguyên hiện có (khi chỉnh sửa) */}
                {editing && Array.isArray(lesson?.resources) && lesson.resources.length > 0 && (
                  <div className="border rounded-3 p-3 mb-3">
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-files me-2" />
                      <h6 className="mb-0">Tài nguyên hiện có</h6>
                      <Badge bg="secondary" pill className="ms-2">
                        {lesson.resources.length}
                      </Badge>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {lesson.resources.map((r, idx) => (
                        <div key={idx} className="d-flex align-items-start gap-2">
                          <div className="mt-1">
                            {r.kind === 'VIDEO' ? (
                              <i className="bi bi-play-circle text-primary" />
                            ) : r.kind === 'PDF' || r.kind === 'DOCUMENT' ? (
                              <i className="bi bi-file-earmark-pdf text-danger" />
                            ) : r.kind === 'IMAGE' ? (
                              <i className="bi bi-image text-success" />
                            ) : r.kind === 'AUDIO' ? (
                              <i className="bi bi-music-note text-warning" />
                            ) : (
                              <i className="bi bi-file-earmark text-muted" />
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{r.title || 'Untitled'}</div>
                            <div className="text-muted small d-flex flex-wrap gap-2">
                              <span>{r.kind || 'OTHER'}</span>
                              {r.mime && <span>• {r.mime}</span>}
                              {typeof r.durationSec === 'number' && (
                                <span>• {Math.round(r.durationSec / 60)} phút</span>
                              )}
                            </div>
                            {r.url && (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="small text-decoration-none"
                              >
                                <i className="bi bi-box-arrow-up-right me-1" />
                                Xem tài nguyên
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hướng dẫn */}
                <div className="border rounded-3 p-3">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-question-circle me-2" />
                    <h6 className="mb-0">Hướng dẫn</h6>
                  </div>
                  <div className="mb-2">
                    <div className="fw-semibold mb-1">Loại bài học</div>
                    <ul className="mb-2 ps-3">
                      <li>
                        <strong>VIDEO</strong>: Bài học dạng video
                      </li>
                      <li>
                        <strong>DOCUMENT</strong>: Tài liệu, PDF, hình ảnh
                      </li>
                      <li>
                        <strong>QUIZ</strong>: Bài kiểm tra, câu hỏi
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="fw-semibold mb-1">Tài nguyên</div>
                    <ul className="mb-0 ps-3">
                      <li>Có thể thêm URL hoặc tải tệp từ máy</li>
                      <li>Hỗ trợ video, PDF, hình ảnh, audio</li>
                      <li>Mỗi tệp tối đa ~50MB</li>
                    </ul>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Modal.Body>

        {/* Footer */}
        <Modal.Footer className="d-flex justify-content-between">
          <div className="text-muted small">
            {!loadingSecs && !sections.length && (
              <>
                <i className="bi bi-exclamation-triangle me-1" />
                Vui lòng tạo chương trước khi thêm bài học
              </>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onHide}>
              Hủy
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <i className="bi bi-check-circle me-1" />
              {editing ? 'Cập nhật' : 'Tạo bài học'}
            </Button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
