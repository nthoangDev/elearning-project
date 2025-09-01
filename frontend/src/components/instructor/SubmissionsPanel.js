import { useEffect, useMemo, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { authApis, endpoints } from '../../configs/Apis';

export default function SubmissionsPanel({
  assessmentId,
  onSelectSubmission,
  groupByLatestPerUser = true
}) {
  const a = authApis();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const res = await a.get(endpoints.assessmentSubmissions(assessmentId));
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(list || []);
    } catch (e) {
      console.error('Load submissions error', e?.response?.data || e?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [assessmentId]);

  const latestByUser = useMemo(() => {
    if (!groupByLatestPerUser) return items;
    const map = new Map();
    for (const s of items) {
      const uid = s?.user?._id || s?.user;
      if (!map.has(uid)) map.set(uid, s); // phần tử đầu là mới nhất do server sort
    }
    return [...map.values()];
  }, [items, groupByLatestPerUser]);

  const rows = groupByLatestPerUser ? latestByUser : items;

  if (!assessmentId) return <Alert variant="light">Chưa chọn Assessment</Alert>;

  return (
    <div className="submissions-panel">
      {loading && (
        <div className="d-flex align-items-center gap-2 text-muted">
          <Spinner size="sm" /> Đang tải submissions…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-muted">Chưa có bài nộp.</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="list-group">
          {rows.map(s => {
            const id = s._id || s.id;
            const u  = s.user || {};
            const name = u.fullName || u.email || 'Sinh viên';
            const at = s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—';
            const st = s.status || '—';
            const score = typeof s.score === 'number' ? `${s.score}%` : '—';
            return (
              <button
                key={id}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => onSelectSubmission?.(id)}
              >
                <div>
                  <div className="fw-semibold">{name}</div>
                  <div className="small text-muted">Nộp lúc: {at}</div>
                </div>
                <div className="text-end">
                  <div className="badge bg-secondary me-2">{st}</div>
                  <div className="fw-semibold">{score}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
