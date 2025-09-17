import { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { authApis, endpoints } from '../../configs/Apis';

export default function AssignmentCreateModal({
  show,
  onHide,
  courseId,
  lessonId,        // 👈 NHẬN lessonId
  onCreated
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    availableAt: '',
    dueAt: '',
    maxScore: 100
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({
        title: '',
        description: '',
        availableAt: '',
        dueAt: '',
        maxScore: 100
      });
    }
  }, [show]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toISO = (s) => (s ? new Date(s).toISOString() : undefined);

  const submit = async () => {
    if (!form.title?.trim()) return alert('Nhập tiêu đề');
    if (!lessonId) return alert('Thiếu lessonId (nút mở modal phải truyền lessonId vào)');

    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || '',
      maxScore: Math.max(1, Number(form.maxScore) || 100),
      ...(form.availableAt ? { availableAt: toISO(form.availableAt) } : {}),
      ...(form.dueAt ? { dueAt: toISO(form.dueAt) } : {}),
    };

    setLoading(true);
    try {
      // 1) Tạo assessment theo khóa học
      const created = await authApis().post(endpoints.createAssignment(lessonId), payload);

      // 2) Gắn assessment vào bài học
      await authApis().post(
        endpoints.attachAssessmentToLesson(lessonId, created.data._id)
      );

      onCreated?.(created.data);
      onHide();
    } catch (e) {
      alert(e?.response?.data?.message || 'Tạo assignment lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton><Modal.Title>Tạo Assignment</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Tiêu đề *</Form.Label>
            <Form.Control name="title" value={form.title} onChange={onChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mô tả (HTML cho phép)</Form.Label>
            <Form.Control as="textarea" rows={4} name="description" value={form.description} onChange={onChange} />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Thang điểm (maxScore)</Form.Label>
                <Form.Control type="number" name="maxScore" value={form.maxScore} onChange={onChange} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Available at</Form.Label>
                <Form.Control type="datetime-local" name="availableAt" value={form.availableAt} onChange={onChange} />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Due at</Form.Label>
                <Form.Control type="datetime-local" name="dueAt" value={form.dueAt} onChange={onChange} />
              </Form.Group>
            </Col>
          </Row>

          {/* KHÔNG có field Section/ Lesson trong form — lessonId lấy từ props */}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Huỷ</Button>
        <Button onClick={submit} disabled={loading}>
          {loading ? <Spinner size="sm" /> : 'Tạo Assignment'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
