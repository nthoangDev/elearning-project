import { useEffect, useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { authApis, endpoints } from '../../configs/Apis';

export default function SectionModal({ show, mode, courseId, section, onHide, onSaved }) {
  const editing = mode === 'edit' && !!section;

  const [form, setForm] = useState({ title: '', summary: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    if (editing) {
      setForm({
        title: section?.title || '',
        summary: section?.summary || ''
      });
    } else {
      setForm({ title: '', summary: '' });
    }
    setError('');
  }, [show, editing, section]);

  const save = async (e) => {
    e.preventDefault();
    if (!courseId) return;

    setSaving(true);
    setError('');
    try {

      if (editing) {
        await  authApis().put(endpoints.sectionById(courseId, section._id), {
          title: form.title.trim(),
          summary: form.summary || ''
        });
      } else {
        await  authApis().post(endpoints.sectionsByCourse(courseId), {
          title: form.title.trim(),
          summary: form.summary || ''
        });
      }

      onHide?.();
      onSaved?.();
    } catch (err) {
      console.error('Save section error:', err?.response?.status, err?.response?.data || err?.message);
      setError(err?.response?.data?.message || 'Không thể lưu chương. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={save}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Sửa chương' : 'Thêm chương'}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3" controlId="sec-title">
            <Form.Label>Tiêu đề <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ví dụ: Chương 1: Mở đầu & định hướng"
              required
              disabled={saving}
            />
          </Form.Group>

          <Form.Group controlId="sec-summary">
            <Form.Label>Mô tả</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Mô tả ngắn gọn về nội dung chương..."
              disabled={saving}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>
            Huỷ
          </Button>
          <Button type="submit" disabled={saving || !form.title.trim()}>
            {saving && <Spinner animation="border" size="sm" className="me-2" />}
            Lưu
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
