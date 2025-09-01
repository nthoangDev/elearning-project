import { useEffect, useState } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { authApis, endpoints } from '../../configs/Apis';

const emptyQ = () => ({
  question: '',
  type: 'SINGLE',
  score: 1,
  options: [{ content: '', isCorrect: false }],
});

export default function QuizCreateModal({ show, courseId, lessonId, onHide, onSaved }) {
  const api = authApis();

  const [title, setTitle] = useState('Bài kiểm tra');
  const [description, setDescription] = useState('');
  const [passScore, setPassScore] = useState(60);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [questions, setQuestions] = useState([emptyQ()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setTitle('Bài kiểm tra');
      setDescription('');
      setPassScore(60);
      setDurationMinutes(10);
      setAttemptsAllowed(1);
      setShuffleQuestions(false);
      setQuestions([emptyQ()]);
      setSaving(false);
    }
  }, [show]);

  const addQuestion = () => setQuestions(q => [...q, emptyQ()]);
  const removeQuestion = (idx) => setQuestions(q => q.filter((_, i) => i !== idx));
  const updateQ = (idx, patch) => setQuestions(q => q.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addOption = (qIdx) =>
    setQuestions(q => q.map((it, i) => (i === qIdx ? { ...it, options: [...(it.options || []), { content: '', isCorrect: false }] } : it)));

  const updateOpt = (qIdx, oIdx, patch) =>
    setQuestions(q =>
      q.map((it, i) => {
        if (i !== qIdx) return it;
        const opts = (it.options || []).map((op, j) => (j === oIdx ? { ...op, ...patch } : op));
        return { ...it, options: opts };
      })
    );

  const removeOpt = (qIdx, oIdx) =>
    setQuestions(q =>
      q.map((it, i) => {
        if (i !== qIdx) return it;
        return { ...it, options: (it.options || []).filter((_, j) => j !== oIdx) };
      })
    );

  const onChangeType = (idx, newType) => {
    setQuestions(q =>
      q.map((it, i) => {
        if (i !== idx) return it;
        if (newType === 'SHORT') return { ...it, type: 'SHORT', options: [] };
        return { ...it, type: newType, options: it.options?.length ? it.options : [{ content: '', isCorrect: false }] };
      })
    );
  };

  const validate = () => {
    if (!courseId) return 'Thiếu courseId';
    if (!lessonId) return 'Thiếu lessonId (nút mở modal phải truyền lesson._id)';
    if (!title.trim()) return 'Nhập tiêu đề';
    if (!questions.length) return 'Thêm ít nhất 1 câu hỏi';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Câu ${i + 1}: nhập nội dung`;
      if (!q.score || Number(q.score) <= 0) return `Câu ${i + 1}: điểm phải > 0`;
      if (q.type !== 'SHORT') {
        if (!q.options?.length) return `Câu ${i + 1}: thêm tối thiểu 1 phương án`;
        const anyContent = q.options.some(op => op.content.trim());
        if (!anyContent) return `Câu ${i + 1}: nội dung phương án còn trống`;
        const correctCount = q.options.filter(op => op.isCorrect).length;
        if (q.type === 'SINGLE' && correctCount !== 1) return `Câu ${i + 1}: SINGLE phải có đúng 1 phương án đúng`;
        if (q.type === 'MULTI' && correctCount < 1) return `Câu ${i + 1}: MULTI phải có ít nhất 1 phương án đúng`;
      }
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) return alert(err);

    const body = {
      title: title.trim(),
      description,
      passScore: Number(passScore) || 60,
      durationMinutes: Number(durationMinutes) || 10,
      attemptsAllowed: Number(attemptsAllowed) || 1,
      shuffleQuestions: !!shuffleQuestions,
      questions: questions.map((q, i) => ({
        question: q.question.trim(),
        type: q.type,
        score: Number(q.score) || 1,
        sortOrder: i + 1,
        options: q.type === 'SHORT'
          ? []
          : (q.options || []).map(op => ({ content: op.content.trim(), isCorrect: !!op.isCorrect })),
      })),
    };

    try {
      setSaving(true);
      // 1) Tạo quiz theo course
      const created = await api.post(endpoints.createQuiz(lessonId), body);
      const assessmentId = created.data?._id;

      // 2) Gắn quiz vào bài học
      await api.post(endpoints.attachAssessmentToLesson(lessonId, assessmentId));

      onHide?.();
      onSaved?.();
    } catch (e) {
      alert(e?.response?.data?.message || 'Tạo quiz lỗi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton><Modal.Title>Tạo Quiz cho bài học</Modal.Title></Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Tiêu đề *</Form.Label>
              <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Mô tả (cho phép HTML)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Mô tả ngắn cho bài kiểm tra…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>Điểm đạt (%)</Form.Label>
              <Form.Control type="number" value={passScore} onChange={(e) => setPassScore(e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>Thời lượng (phút)</Form.Label>
              <Form.Control type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group className="mb-3">
              <Form.Label>Lần làm</Form.Label>
              <Form.Control type="number" value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(e.target.value)} />
            </Form.Group>
          </Col>
          <Col md={3} className="d-flex align-items-end">
            <Form.Check
              className="mb-3"
              label="Trộn câu hỏi"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
            />
          </Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Câu hỏi <Badge bg="secondary">{questions.length}</Badge></h6>
          <Button size="sm" onClick={addQuestion}><i className="bi bi-plus-circle me-1" />Thêm câu hỏi</Button>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="border rounded p-2 mb-3">
            <Row className="g-2">
              <Col md={8}>
                <Form.Control
                  placeholder={`Câu hỏi #${qi + 1}`}
                  value={q.question}
                  onChange={(e) => updateQ(qi, { question: e.target.value })}
                />
              </Col>
              <Col md={2}>
                <Form.Select value={q.type} onChange={(e) => onChangeType(qi, e.target.value)}>
                  <option value="SINGLE">1 đáp án</option>
                  <option value="MULTI">Nhiều đáp án</option>
                  <option value="SHORT">Tự luận ngắn</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Control
                  type="number"
                  value={q.score}
                  onChange={(e) => updateQ(qi, { score: Number(e.target.value) || 1 })}
                />
              </Col>
            </Row>

            {q.type !== 'SHORT' && (
              <div className="mt-2">
                <small className="text-muted">Tuỳ chọn</small>
                {(q.options || []).map((op, oi) => (
                  <Row key={oi} className="g-2 align-items-center mt-1">
                    <Col md={9}>
                      <Form.Control
                        placeholder={`Phương án #${oi + 1}`}
                        value={op.content}
                        onChange={(e) => updateOpt(qi, oi, { content: e.target.value })}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Check
                        type="checkbox"
                        label="Đúng"
                        checked={!!op.isCorrect}
                        onChange={(e) => updateOpt(qi, oi, { isCorrect: e.target.checked })}
                      />
                    </Col>
                    <Col md={1}>
                      <Button size="sm" variant="outline-danger" onClick={() => removeOpt(qi, oi)}>
                        <i className="bi bi-x-lg" />
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="mt-2"
                  onClick={() => addOption(qi)}
                >
                  + Thêm phương án
                </Button>
              </div>
            )}

            <div className="text-end mt-2">
              <Button size="sm" variant="outline-danger" onClick={() => removeQuestion(qi)}>
                Xoá câu hỏi
              </Button>
            </div>
          </div>
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Huỷ</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner size="sm" /> : 'Lưu Quiz'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
