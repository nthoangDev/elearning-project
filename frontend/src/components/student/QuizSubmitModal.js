import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { authApis, endpoints } from "../../configs/Apis";

export default function QuizSubmitModal({ show, onHide, assessmentId, onSubmitted }) {
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [asmt, setAsmt] = useState(null); // { title, questions:[{type,text,options:[{text}],score}] }
  const [startedAt, setStartedAt] = useState("");
  /**
   * selections: array same length as questions
   *  - SINGLE: number | null
   *  - MULTI : Set<number>
   *  - SHORT : string
   */
  const [selections, setSelections] = useState([]);

  // ------------- helpers -------------
  const detailUrl = useMemo(
    () =>
      endpoints?.assessmentDetail?.(assessmentId) ||
      `/api/student/assessments/${assessmentId}`,
    [assessmentId]
  );

  const submitUrl = useMemo(
    () =>
      endpoints?.submitQuiz?.(assessmentId) ||
      `/api/student/assessments/${assessmentId}/submit-quiz`,
    [assessmentId]
  );

  const normalizeAssessment = (raw) => {
    if (!raw) return null;

    const type = String(raw.assessmentType || raw.type || "QUIZ").toUpperCase();

    const quizBlock = raw.quiz || {};

    const questionsSrc = Array.isArray(raw.questions)
      ? raw.questions
      : Array.isArray(quizBlock.questions)
        ? quizBlock.questions
        : [];

    const passScore =
      raw.passScore ?? quizBlock.passScore ?? 60;
    const attemptsAllowed =
      raw.attemptsAllowed ?? quizBlock.attemptsAllowed ?? null;
    const availableAt =
      raw.availableAt ?? quizBlock.availableAt ?? null;
    const dueAt =
      raw.dueAt ?? quizBlock.dueAt ?? null;

    const normQs = questionsSrc.map((q) => {
      const qType = q.type || q.questionType || "SINGLE";

      const qText = q.text ?? q.title ?? q.question ?? "";

      let opts = Array.isArray(q.options) ? q.options : [];
      opts = opts.map((o) => {
        if (o && typeof o === "object") {
          return { text: o.text ?? o.label ?? o.content ?? String(o.value ?? "") };
        }
        return { text: String(o ?? "") };
      });

      return {
        type: qType,
        text: qText,
        score: typeof q.score === "number" ? q.score : 1,
        options: opts,
      };
    });

    return {
      _id: String(raw._id || ""),
      assessmentType: type,
      title: raw.title || "Quiz",
      passScore,
      availableAt,
      dueAt,
      attemptsAllowed,
      questions: normQs,
    };
  };


  // ------------- load quiz detail -------------
  useEffect(() => {
    if (!show || !assessmentId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadErr("");
      setSubmitErr("");
      try {
        const res = await authApis().get(detailUrl);
        const raw = res.data?.assessment || res.data || {};
        const normalized = normalizeAssessment(raw);

        if (!normalized || normalized.assessmentType !== "QUIZ" || normalized.questions.length === 0) {
          if (mounted) {
            setAsmt(null);
            setLoadErr("Không có dữ liệu bài kiểm tra.");
          }
          return;
        }

        const initSelections = normalized.questions.map((q) => {
          if (q.type === "SINGLE") return null;         // radio
          if (q.type === "MULTI") return new Set();     // checkbox
          if (q.type === "SHORT") return "";            // short answer
          return null;
        });

        if (mounted) {
          setAsmt(normalized);
          setSelections(initSelections);
          setStartedAt(new Date().toISOString());
        }
      } catch (e) {
        if (mounted) {
          setAsmt(null);
          setLoadErr("Không tải được đề quiz");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, assessmentId]);

  // ------------- UI handlers -------------
  const onPickSingle = (qIdx, optIdx) => {
    setSelections((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const onToggleMulti = (qIdx, optIdx) => {
    setSelections((prev) => {
      const next = [...prev];
      const set = new Set(next[qIdx] || []);
      if (set.has(optIdx)) set.delete(optIdx);
      else set.add(optIdx);
      next[qIdx] = set;
      return next;
    });
  };

  const onChangeShort = (qIdx, val) => {
    setSelections((prev) => {
      const next = [...prev];
      next[qIdx] = val;
      return next;
    });
  };

  const buildAnswersJson = () => {
    // FE -> BE: answersJson is a **stringified JSON** of an array,
    // where NON-SHORT questions are arrays of selected indices,
    // SHORT questions can be [] (grading ignores SHORT).
    const arr = (asmt?.questions || []).map((q, i) => {
      const sel = selections[i];
      if (q.type === "SINGLE") {
        return sel === null || sel === undefined ? [] : [sel];
      }
      if (q.type === "MULTI") {
        const s = Array.from(sel || []);
        s.sort((a, b) => a - b);
        return s;
      }
      if (q.type === "SHORT") {
        // BE bỏ qua grading SHORT, nhưng ta vẫn có thể gửi trống để phù hợp schema
        // (Nếu cần lưu text thực tế, có thể gửi ["text"] – BE hiện không chấm SHORT)
        return [];
      }
      return [];
    });
    return JSON.stringify(arr);
  };

  const validateBeforeSubmit = () => {
    if (!asmt) return "Không có dữ liệu bài kiểm tra.";
    if (!Array.isArray(asmt.questions) || asmt.questions.length === 0) {
      return "Không có câu hỏi trong bài kiểm tra.";
    }
    // Example strict validation: yêu cầu chọn ở SINGLE (tuỳ yêu cầu)
    // for (let i = 0; i < asmt.questions.length; i++) {
    //   const q = asmt.questions[i];
    //   if (q.type === "SINGLE" && (selections[i] === null || selections[i] === undefined)) {
    //     return `Vui lòng chọn đáp án cho câu ${i + 1}`;
    //   }
    // }
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitErr("");

    const err = validateBeforeSubmit();
    if (err) {
      setSubmitErr(err);
      return;
    }

    try {
      setSubmitting(true);
      const answersJson = buildAnswersJson();
      const payload = { answersJson };
      if (startedAt) payload.startedAt = startedAt;

      const res = await authApis().post(submitUrl, payload);
      onSubmitted?.(res.data);
      onHide?.();
    } catch (e) {
      setSubmitErr(e?.response?.data || e?.response?.data?.message || "Nộp quiz thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtTime = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  // ------------- render -------------
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Nộp Quiz</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {loading && (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" /> Đang tải đề…
            </div>
          )}

          {!loading && loadErr && <Alert variant="warning">{loadErr}</Alert>}

          {!loading && !loadErr && asmt && (
            <>
              <div className="mb-3">
                <div className="fw-bold fs-5">{asmt.title}</div>
                <div className="text-muted small">
                  Điểm đạt: {asmt.passScore}% • Mở: {fmtTime(asmt.availableAt)} • Hạn: {fmtTime(asmt.dueAt)}
                </div>
              </div>

              {/* <Form.Group className="mb-3" controlId="qs-startedAt">
                <Form.Label>Thời điểm bắt đầu (ISO, tuỳ chọn)</Form.Label>
                <Form.Control
                  type="text"
                  value={startedAt}
                  placeholder="2025-09-02T05:00:00.000Z"
                  onChange={(e) => setStartedAt(e.target.value)}
                />
              </Form.Group> */}

              {(asmt.questions || []).map((q, i) => (
                <div key={i} className="mb-4 p-3 border rounded">
                  <div className="fw-semibold mb-2">
                    Câu {i + 1}: {q.text}
                    {typeof q.score === "number" && q.score !== 1 ? (
                      <span className="ms-2 badge bg-light text-dark">Điểm: {q.score}</span>
                    ) : null}
                  </div>

                  {q.type === "SINGLE" && (
                    <div className="d-flex flex-column gap-2">
                      {q.options.map((o, oi) => (
                        <Form.Check
                          key={oi}
                          type="radio"
                          name={`q-${i}`}
                          id={`q-${i}-opt-${oi}`}
                          label={o.text || `Lựa chọn ${oi + 1}`}
                          checked={selections[i] === oi}
                          onChange={() => onPickSingle(i, oi)}
                        />
                      ))}
                    </div>
                  )}

                  {q.type === "MULTI" && (
                    <div className="d-flex flex-column gap-2">
                      {q.options.map((o, oi) => {
                        const set = selections[i] || new Set();
                        const checked = set instanceof Set ? set.has(oi) : false;
                        return (
                          <Form.Check
                            key={oi}
                            type="checkbox"
                            id={`q-${i}-opt-${oi}`}
                            label={o.text || `Lựa chọn ${oi + 1}`}
                            checked={checked}
                            onChange={() => onToggleMulti(i, oi)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {q.type === "SHORT" && (
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={selections[i] || ""}
                      onChange={(e) => onChangeShort(i, e.target.value)}
                      placeholder="Nhập câu trả lời ngắn…"
                    />
                  )}
                </div>
              ))}

              {submitErr && <Alert variant="danger">{submitErr}</Alert>}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || loading || !asmt}>
            {submitting ? "Đang nộp..." : "Nộp quiz"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
