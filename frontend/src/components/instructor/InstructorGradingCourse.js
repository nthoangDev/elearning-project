// src/components/instructor/InstructorGradingCourse.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { authApis, endpoints } from "../../configs/Apis";
import "./grading.css";
import SubmissionGrader from "./SubmissionGrader";

const Tag = ({ children, tone = "ok" }) => (
  <span className={`tag tag--${tone}`}>{children}</span>
);

function AssessmentCard({ a, sub, onOpen }) {
  const type = a?.assessmentType; // 'ASSIGNMENT' | 'QUIZ'
  const hasSubmission = !!sub?._id;
  const graded = sub?.status === "GRADED";

  // điểm (%) theo BE
  const scorePct = typeof sub?.score === "number" ? sub.score : null;

  // trạng thái đúng/trễ hạn theo học viên hiện tại
  const dueMs = a?.dueAt ? +new Date(a.dueAt) : null;
  const subMs = sub?.submittedAt ? +new Date(sub.submittedAt) : null;
  const hasDue = !!dueMs;
  const onTime = hasSubmission && hasDue ? subMs <= dueMs : false;

  // nhãn loại
  let typeLabel = "Đánh giá";
  if (type === "ASSIGNMENT") typeLabel = "Bài tập";
  if (type === "QUIZ") typeLabel = "Quiz";

  // nhãn nút
  let actionLabel = "Mở";
  if (type === "ASSIGNMENT") actionLabel = graded ? "Xem / Sửa điểm" : "Chấm bài";
  if (type === "QUIZ") actionLabel = "Xem / Nhận xét";

  return (
    <div className="ass-card">
      <div className="ass-head">
        <div className="ass-title">
          {a?.title}
          {type && <span className="tag" style={{ marginLeft: 8 }}>{typeLabel}</span>}
        </div>
        <div className="ass-tags">
          {!hasSubmission && <Tag tone="warn">Chưa nộp</Tag>}
          {hasSubmission && <Tag>Đã nộp</Tag>}
          {hasSubmission && hasDue && (onTime ? <Tag>Nộp đúng giờ</Tag> : <Tag tone="warn">Trễ hạn</Tag>)}
          {graded && <Tag>Đã chấm</Tag>}
        </div>
      </div>

      <div className="ass-score">
        <span className="score">{scorePct !== null ? scorePct : "—"}</span>
        <span className="score-deno">%</span>
      </div>

      <button
        className="btn-outline"
        onClick={onOpen}
        disabled={!hasSubmission}
        title={!hasSubmission ? "Chưa có bài nộp" : undefined}
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function InstructorGradingCourse() {
  const { courseId } = useParams();

  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [subsByAssess, setSubsByAssess] = useState({});
  const [subsLoading, setSubsLoading] = useState(false);

  const [lessonId, setLessonId] = useState("");
  const [studentId, setStudentId] = useState("");

  // panel chấm bài
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  const fetchSeqRef = useRef(0);

  const selectedStudent = useMemo(
    () => students.find((u) => String(u._id) === String(studentId)),
    [students, studentId]
  );

  // load lessons + students
  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const api = authApis();

      // Outline: sections[] mỗi section có lessons[]
      const sec = await api.get(endpoints.courseContent(courseId));
      const ls = (sec.data || []).flatMap((s) => s.lessons || []);
      setLessons(ls);
      setLessonId(ls[0]?._id || "");

      // Học viên của khoá (có thể trả {items:[]} hoặc [])
      const st = await api.get(endpoints.courseStudents(courseId));
      const list = Array.isArray(st.data) ? st.data : (st.data?.items || []);
      setStudents(list);
      setStudentId(list[0]?._id || "");
    })().catch(console.error);
  }, [courseId]);

  // load assessments của bài học
  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      const res = await authApis().get(endpoints.instructorLessonDetail(lessonId));
      const lesson = res.data || {};
      let arr = [];

      if (Array.isArray(lesson.assessments)) {
        // có thể là doc thuần hoặc link có field 'assessment'
        arr = lesson.assessments.map((it) => {
          if (it && it.assessment) {
            return {
              ...it.assessment,
              _linkId: it._id,
              sortOrder: it.sortOrder ?? it.assessment?.sortOrder,
            };
          }
          return it;
        });
      }

      arr = (arr || [])
        .filter(Boolean)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      setAssessments(arr);
    })().catch(console.error);
  }, [lessonId]);

  // reset map khi đổi học sinh để tránh "dính" trạng thái
  useEffect(() => {
    setSubsByAssess({});
  }, [studentId]);

  // hàm reload submissions cho học viên hiện tại
  const reloadSubsForStudent = async (sid = studentId, list = assessments) => {
    if (!sid || !list.length) {
      setSubsByAssess({});
      return;
    }
    const fetchSeq = ++fetchSeqRef.current;
    setSubsLoading(true);
    try {
      const api = authApis();
      const results = await Promise.all(
        list.map((a) => api.get(`${endpoints.assessmentSubmissions(a._id)}?user=${sid}`))
      );

      if (fetchSeq !== fetchSeqRef.current) return;

      const map = {};
      results.forEach((r, i) => {
        const data = r.data;
        const arr = Array.isArray(data) ? data : (data?.items || []);
        map[list[i]._id] = arr[0] || null; // rỗng => chưa nộp
      });
      setSubsByAssess(map);
    } catch (e) {
      if (fetchSeq === fetchSeqRef.current) setSubsByAssess({});
      console.error(e);
    } finally {
      if (fetchSeq === fetchSeqRef.current) setSubsLoading(false);
    }
  };

  // load bài nộp của HỌC VIÊN ĐANG CHỌN cho tất cả assessment
  useEffect(() => {
    reloadSubsForStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, assessments]);

  const openSubmission = (a) => {
    const s = subsByAssess[a._id];
    if (!s?._id) return; // đã disable nút nếu chưa nộp
    setActiveSubmissionId(s._id); // mở panel chấm bài
  };

  return (
    <div className="grading-wrap">
      <div className="grading-panels">
        {/* Cột 1: Bài học */}
        <div className="panel">
          <div className="panel-title">Bài học</div>
          <div className="list">
            {lessons.map((l) => (
              <button
                key={l._id}
                className={`list-item ${lessonId === l._id ? "active" : ""}`}
                onClick={() => setLessonId(l._id)}
              >
                {l.title}
              </button>
            ))}
            {!lessons.length && <div className="empty">Chưa có bài học</div>}
          </div>
        </div>

        {/* Cột 2: Học sinh */}
        <div className="panel">
          <div className="panel-title">Học sinh</div>
          <div className="list">
            {students.map((u) => (
              <button
                key={u._id}
                className={`list-item ${studentId === u._id ? "active" : ""}`}
                onClick={() => setStudentId(u._id)}
              >
                {u.fullName || u.email}
              </button>
            ))}
            {!students.length && <div className="empty">Chưa có học viên</div>}
          </div>
        </div>

        {/* Cột 3: Đánh giá của học sinh */}
        <div className="panel">
          <div className="panel-title">
            Đánh giá {selectedStudent ? `— ${selectedStudent.fullName || selectedStudent.email}` : ""}
          </div>

          {subsLoading ? (
            <div className="empty">Đang tải bài nộp…</div>
          ) : (
            <div className="ass-list">
              {assessments.map((a) => (
                <AssessmentCard
                  key={a._id}
                  a={a}
                  sub={subsByAssess[a._id]}
                  onOpen={() => openSubmission(a)}
                />
              ))}
              {!assessments.length && (
                <div className="empty">Bài học này chưa có bài tập/quiz</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel chấm bài */}
      <SubmissionGrader
        show={!!activeSubmissionId}
        submissionId={activeSubmissionId}
        onClose={() => setActiveSubmissionId(null)}
        onDone={() => reloadSubsForStudent()}
      />
    </div>
  );
}
