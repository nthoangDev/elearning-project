import { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { authApis, endpoints } from "../../configs/Apis";

export default function AssignmentSubmitModal({ show, onHide, assessmentId, onSubmitted }) {
  const [files, setFiles] = useState([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      setSubmitting(true);
      const url = endpoints?.submitAssignment?.(assessmentId) || `/api/student/assessments/${assessmentId}/submit-assignment`;
      const fd = new FormData();
      if (startedAt) fd.append("startedAt", startedAt);
      if (textAnswer) fd.append("textAnswer", textAnswer);
      // Quan trọng: key 'attachments' khớp với Multer trên BE
      Array.from(files || []).forEach((f) => fd.append("attachments", f));

      const res = await authApis().post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSubmitted?.(res.data);
      onHide();
    } catch (e) {
      setErr(e?.response?.data?.message || "Nộp bài thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton><Modal.Title>Nộp bài tập</Modal.Title></Modal.Header>
        <Modal.Body>
          {err && <Alert variant="danger">{err}</Alert>}
          <Form.Group className="mb-3">
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Ghi chú / trả lời văn bản</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Nhập nội dung câu trả lời (tuỳ chọn)"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Tệp đính kèm</Form.Label>
            <Form.Control type="file" multiple onChange={(e) => setFiles(e.target.files)} />
            <Form.Text className="text-muted">Bạn có thể chọn nhiều file (PDF, DOCX, ZIP...).</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>Huỷ</Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Đang nộp..." : "Nộp bài"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
