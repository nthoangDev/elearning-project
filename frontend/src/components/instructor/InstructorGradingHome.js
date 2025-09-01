// InstructorGradingHome.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApis, endpoints } from "../../configs/Apis";
import "./grading.css";

export default function InstructorGradingHome() {
  const nav = useNavigate();
  const [courses, setCourses] = useState([]);
  const [counts, setCounts] = useState({});   // 👈 map courseId -> count
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const api = authApis();
        const res = await api.get(endpoints.instructorMyCourses);
        const list = res.data || [];
        setCourses(list);

        // Lấy số HV từng khoá (song song)
        const pairs = await Promise.all(
          list.map(async (c) => {
            try {
              const r = await api.get(endpoints.courseStudents(c._id));
              const arr = Array.isArray(r.data) ? r.data : (r.data.items || []);
              return [c._id, arr.length];
            } catch {
              return [c._id, 0];
            }
          })
        );
        setCounts(Object.fromEntries(pairs));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="grading-wrap">
      <h2>Bài tập về nhà</h2>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="list">
          {loading && <div className="empty">Đang tải…</div>}
          {!loading && courses.length === 0 && (
            <div className="empty">Bạn chưa có khoá dạy</div>
          )}
          {courses.map((c) => (
            <button
              key={c._id}
              className="list-item"
              onClick={() => nav(`/instructor/grading/${c._id}`)}
            >
              <div style={{ fontWeight: 700 }}>{c.title || c.code}</div>
              <div className="muted">{(counts[c._id] ?? 0)} học viên</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
