import { useEffect, useState } from 'react';
import { Offcanvas, Button, Spinner, Form, Badge } from 'react-bootstrap';
import { authApis, endpoints } from '../../configs/Apis';
import './submission-grader.css';

export default function SubmissionGrader({ show, submissionId, onClose, onDone }) {
    const api = authApis();

    const [sub, setSub] = useState(null);
    const [loading, setLoading] = useState(false);

    // form chấm điểm (% 0..100) + pass + feedback
    const [score, setScore] = useState('');
    const [pass, setPass] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [grading, setGrading] = useState(false);

    // note nhận xét rời
    const [note, setNote] = useState('');
    const [commenting, setCommenting] = useState(false);

    const clampPct = (v) => {
        const n = Number(v);
        if (Number.isNaN(n)) return 0;
        return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
    };

    const load = async () => {
        if (!submissionId) return;
        setLoading(true);
        try {
            const res = await api.get(endpoints.submissionDetail(submissionId));
            const s = res.data || null;
            setSub(s);
            setScore(typeof s?.score === 'number' ? s.score : '');
            setPass(!!s?.pass);
            setFeedback(s?.feedback || '');
        } catch (e) {
            console.error('load submission detail error:', e?.response?.data || e?.message);
            setSub(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (show && submissionId) load(); /* eslint-disable-next-line */ }, [show, submissionId]);

    const doGrade = async () => {
        setGrading(true);
        try {
            await api.post(endpoints.gradeSubmission(submissionId), {
                score: score === '' ? 0 : clampPct(score),
                pass: !!pass,
                feedback: feedback || ''
            });
            onDone?.();
            onClose?.();
        } catch (e) {
            alert(e?.response?.data?.message || 'Chấm điểm lỗi');
        } finally {
            setGrading(false);
        }
    };

    const sendComment = async () => {
        if (!note.trim()) return;
        setCommenting(true);
        try {
            await api.post(endpoints.commentSubmission(submissionId), { message: note.trim() });
            setNote('');
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || 'Gửi nhận xét lỗi');
        } finally {
            setCommenting(false);
        }
    };

    const isAssignment = !!sub?.textAnswer || (sub?.attachments?.length > 0);
    const title = sub?.assessment?.title || sub?.assessmentTitle || 'Chấm điểm';

    return (
        <Offcanvas 
            show={show} 
            onHide={onClose} 
            placement="start" 
            scroll 
            backdrop 
            className="submission-grader-offcanvas"
            style={{ '--bs-offcanvas-width': '720px' }}
        >
            <Offcanvas.Header closeButton className="submission-grader-header">
                <Offcanvas.Title className="submission-grader-title">
                    <div className="title-content">
                        <span className="title-text">{title}</span>
                        {sub?.status && (
                            <Badge 
                                bg={sub.status === 'GRADED' ? 'success' : 'secondary'} 
                                className="status-badge"
                            >
                                {sub.status === 'GRADED' ? 'Đã chấm' : sub.status}
                            </Badge>
                        )}
                    </div>
                </Offcanvas.Title>
            </Offcanvas.Header>

            <Offcanvas.Body className="submission-grader-body">
                {loading ? (
                    <div className="loading-container">
                        <Spinner className="loading-spinner" />
                        <span className="loading-text">Đang tải bài nộp...</span>
                    </div>
                ) : !sub ? (
                    <div className="empty-container">
                        <div className="empty-icon">📝</div>
                        <h5>Không tìm thấy bài nộp</h5>
                        <p className="text-muted">Bài nộp không tồn tại hoặc đã bị xóa</p>
                    </div>
                ) : (
                    <div className="grader-content">

                        {/* Vùng hiển thị nội dung bài nộp */}
                        <section className="submission-section">
                            <div className="section-header">
                                <h6 className="section-title">Bài nộp của học viên</h6>
                            </div>
                            
                            <div className="submission-content">
                                {isAssignment ? (
                                    <>
                                        {sub.textAnswer && (
                                            <div className="text-answer">
                                                <div className="answer-label">Câu trả lời:</div>
                                                <div className="answer-content">
                                                    {sub.textAnswer}
                                                </div>
                                            </div>
                                        )}
                                        {(sub.attachments || []).map((a, i) => (
                                            <div key={i} className="attachment-item">
                                                <div className="attachment-icon">
                                                    <i className="bi bi-paperclip" />
                                                </div>
                                                <a 
                                                    href={a.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="attachment-link"
                                                >
                                                    {a.title || a.url}
                                                    <i className="bi bi-box-arrow-up-right ms-1" />
                                                </a>
                                                {a.mime && (
                                                    <span className="attachment-type">
                                                        {a.mime.split('/')?.[1]?.toUpperCase() || ''}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="quiz-info">
                                        <div className="info-icon">ℹ️</div>
                                        <div>
                                            <strong>Bài quiz tự động</strong>
                                            <p className="mb-0">Điểm được hệ thống tự tính. Nếu có câu "SHORT" thì bạn có thể điều chỉnh điểm và ghi nhận xét bên dưới.</p>
                                        </div>
                                    </div>
                                )}

                                {sub.answersJson && (
                                    <details className="answers-json">
                                        <summary className="json-summary">
                                            Xem dữ liệu trả lời chi tiết
                                        </summary>
                                        <pre className="json-content">
                                            {JSON.stringify(sub.answersJson, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        </section>

                        {/* Form chấm điểm */}
                        <section className="grading-section">
                            <div className="section-header">
                                <h6 className="section-title">Chấm điểm</h6>
                            </div>

                            <div className="grading-mode">
                                <Form.Check
                                    type="radio"
                                    id="mode-grade"
                                    name="grading-mode"
                                    label="Chấm bài"
                                    checked={pass === true}
                                    onChange={() => setPass(true)}
                                    className="mode-option"
                                />
                                <Form.Check
                                    type="radio"
                                    id="mode-redo"
                                    name="grading-mode"
                                    label="Yêu cầu làm lại bài"
                                    checked={pass === false}
                                    onChange={() => setPass(false)}
                                    className="mode-option mode-redo"
                                />
                            </div>

                            <Form className="grading-form">
                                <Form.Group className="score-group">
                                    <Form.Label className="form-label me-3">Điểm số (%)</Form.Label>
                                    <div className="score-input-wrapper">
                                        <Form.Control
                                            type="number"
                                            step="0.1"
                                            min={0}
                                            max={100}
                                            value={score}
                                            onChange={e => setScore(e.target.value)}
                                            placeholder="0 - 100"
                                            disabled={pass === false}
                                            className="score-input"
                                        />
                                        <span className="score-unit">%</span>
                                    </div>
                                    <div className="form-help">
                                        Nhập điểm từ 0 đến 100. Nếu chọn "Yêu cầu làm lại", điểm không bắt buộc.
                                    </div>
                                </Form.Group>

                                <Form.Group className="feedback-group">
                                    <Form.Label className="form-label">Phản hồi gửi cho học viên</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                        placeholder="Nhận xét, gợi ý cải thiện..."
                                        className="feedback-input"
                                    />
                                </Form.Group>

                                <Button 
                                    onClick={doGrade} 
                                    disabled={grading}
                                    className="submit-grade-btn"
                                    size="lg"
                                >
                                    {grading ? (
                                        <>
                                            <Spinner size="sm" className="me-2" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-circle me-2" />
                                            Lưu & Trả bài
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </section>

                        {/* Nhận xét rời */}
                        <section className="comments-section">
                            <div className="section-header">
                                <h6 className="section-title">Nhận xét & Trao đổi</h6>
                            </div>

                            <div className="comment-input-group">
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Nhập nhận xét hoặc câu hỏi..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="comment-input"
                                />
                                <Button 
                                    variant="outline-primary" 
                                    onClick={sendComment} 
                                    disabled={commenting || !note.trim()}
                                    className="send-comment-btn"
                                >
                                    {commenting ? (
                                        <Spinner size="sm" />
                                    ) : (
                                        <>
                                            <i className="bi bi-send" />
                                            <span className="btn-text">Gửi</span>
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="comments-list">
                                {(sub.comments || []).map((c, i) => (
                                    <div key={i} className="comment-item">
                                        <div className="comment-header">
                                            <span className="comment-author">
                                                {c.user?.fullName || 'Giảng viên'}
                                            </span>
                                            <span className="comment-time">
                                                {new Date(c.createdAt).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                        <div className="comment-message">{c.message}</div>
                                    </div>
                                ))}
                                {!sub.comments?.length && (
                                    <div className="no-comments">
                                        <i className="bi bi-chat-dots text-muted me-2" />
                                        Chưa có nhận xét nào
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </Offcanvas.Body>
        </Offcanvas>
    );
}