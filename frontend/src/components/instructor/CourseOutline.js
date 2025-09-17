import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Accordion, Badge, Button, Table, Alert, Dropdown } from 'react-bootstrap';
import { authApis, endpoints } from '../../configs/Apis';
import SectionModal from './SectionModal';
import LessonForm from './LessonForm';
import Confirm from '../../components/layout/Confirm';
import AssignmentCreateModal from './AssignmentCreateModal';
import QuizCreateModal from './QuizCreateModal';

function fmtMinutes(sec) {
  const s = Number(sec) || 0;
  if (!s) return '—';
  const m = Math.round(s / 60);
  return m ? `${m} phút` : `${s}s`;
}

export default function CourseOutline() {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const openSectionFromQuery = searchParams.get('section');

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [mapLessons, setMapLessons] = useState({});
  const [confirm, setConfirm] = useState({ show: false, onOk: null, message: '' });

  // Modals
  const [showSec, setShowSec] = useState({ show: false, mode: 'create', section: null });
  const [showLesson, setShowLesson] = useState({ show: false, sectionId: null, lesson: null });

  const [showQuiz, setShowQuiz] = useState({ show: false, lessonId: null });
  const [showAssignment, setShowAssignment] = useState({ show: false, lessonId: null });

  const loadContent = async () => {
    try {
      const a = authApis();
      const res = await a.get(endpoints.courseOutline(courseId));
      const data = res.data;

      // data là mảng sections
      const secs = Array.isArray(data)
        ? [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : [];

      const lessonsMap = Object.fromEntries(
        secs.map(s => {
          const ls = Array.isArray(s.lessons)
            ? [...s.lessons].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            : [];
          return [s._id, ls];
        })
      );

      setSections(secs);
      setMapLessons(lessonsMap);

      setCourse(null);
    } catch (e) {
      console.error('Load outline lỗi:', e?.response?.status, e?.response?.data || e?.message);
      setCourse(null);
      setSections([]);
      setMapLessons({});
    }
  };

  useEffect(() => { loadContent(); /* eslint-disable-next-line */ }, [courseId]);

  // Summary stats
  const { totalSections, totalLessons } = useMemo(() => {
    const secCount = sections.length;
    const lesCount = sections.reduce((acc, s) => acc + (mapLessons[s._id]?.length || 0), 0);
    return { totalSections: secCount, totalLessons: lesCount };
  }, [sections, mapLessons]);

  // Actions
  const openCreateSection = () => setShowSec({ show: true, mode: 'create', section: null });
  const openEditSection = (s) => setShowSec({ show: true, mode: 'edit', section: s });

  const removeSection = (sectionId) => {
    setConfirm({
      show: true,
      message: 'Xoá chương này và toàn bộ bài học?',
      onOk: async () => {
        try {
          await authApis().delete(endpoints.sectionById(courseId, sectionId));
          setConfirm({ show: false });
          loadContent();
        } catch (e) {
          console.error('Delete section error:', e?.response?.status, e?.response?.data || e?.message);
          setConfirm({ show: false });
        }
      }
    });
  };

  const moveSection = async (sectionId, dir) => {
    try {
      await authApis().patch(endpoints.moveSection(courseId, sectionId), { dir });
      loadContent();
    } catch (e) {
      console.error('Move section lỗi:', e?.response?.status, e?.response?.data || e?.message);
    }
  };

  const openCreateLesson = (sectionId) => setShowLesson({ show: true, sectionId, lesson: null });
  const openEditLesson = (sectionId, lesson) => setShowLesson({ show: true, sectionId, lesson });

  const removeLesson = (lessonId) => {
    setConfirm({
      show: true,
      message: 'Xoá bài học này?',
      onOk: async () => {
        await authApis().delete(endpoints.lessonById(lessonId));
        setConfirm({ show: false });
        loadContent();
      }
    });
  };

  const moveLesson = async (lessonId, dir) => {
    try {
      await authApis().patch(`/api/instructor/lessons/${lessonId}/move`, { dir });
      loadContent();
    } catch (e) {
      console.error('Move lesson lỗi:', e?.response?.status, e?.response?.data || e?.message);
    }
  };

  // Mặc định mở panel theo query ?section=... hoặc panel đầu tiên
  const defaultActiveKey = useMemo(() => {
    if (!sections.length) return undefined;
    if (openSectionFromQuery && sections.some(s => String(s._id) === String(openSectionFromQuery))) {
      const idx = sections.findIndex(s => String(s._id) === String(openSectionFromQuery));
      return String(idx);
    }
    return '0';
  }, [sections, openSectionFromQuery]);

  return (
    <>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-3">
          <h4 className="mb-0">{course?.title || 'Nội dung khóa học'}</h4>
          <div className="d-flex align-items-center gap-3 text-muted">
            <span className="d-inline-flex align-items-center gap-1">
              <i className="bi bi-collection" />
              <span>{totalSections} chương</span>
            </span>
            <span className="d-inline-flex align-items-center gap-1">
              <i className="bi bi-play-circle" />
              <span>{totalLessons} bài học</span>
            </span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button onClick={openCreateSection}>
            <i className="bi bi-plus-circle me-1" />
            Thêm chương
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {sections.length === 0 && (
        <Alert variant="light" className="d-flex align-items-center gap-2">
          <i className="bi bi-journal-x" />
          <div>
            <div className="fw-semibold">Chưa có chương nào</div>
            <div className="text-muted">Hãy tạo chương đầu tiên để bắt đầu xây dựng khóa học của bạn</div>
          </div>
        </Alert>
      )}

      {/* Sections Accordion */}
      {sections.length > 0 && (
        <Accordion defaultActiveKey={defaultActiveKey} alwaysOpen className="mt-2">
          {sections.map((s, idx) => (
            <Accordion.Item eventKey={String(idx)} key={s._id}>
              <Accordion.Header>
                <div className="d-flex align-items-center w-100">
                  <div className="d-flex align-items-center flex-grow-1">
                    <span className="badge rounded-pill bg-secondary me-2" title="Thứ tự chương">
                      {s.sortOrder ?? (idx + 1)}
                    </span>
                    <div className="me-2 fw-semibold">{s.title || `Chương ${s.sortOrder ?? (idx + 1)}`}</div>
                    {!!s.summary && <span className="text-muted small">{s.summary}</span>}
                  </div>
                  <div className="ms-auto d-flex align-items-center gap-3">
                    <span className="text-muted small d-inline-flex align-items-center gap-1">
                      <i className="bi bi-play-circle" />
                      <span>{(mapLessons[s._id] || []).length}</span>
                    </span>
                  </div>
                </div>
              </Accordion.Header>

              <Accordion.Body>
                {/* Section actions */}
                <div className="mb-2 d-flex gap-2">
                  <Button size="sm" variant="outline-secondary" onClick={() => moveSection(s._id, 'up')}>
                    <i className="bi bi-arrow-up" /> Chuyển lên
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => moveSection(s._id, 'down')}>
                    <i className="bi bi-arrow-down" /> Chuyển xuống
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={() => openEditSection(s)}>
                    <i className="bi bi-pencil-square" /> Sửa chương
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => removeSection(s._id)}>
                    <i className="bi bi-trash" /> Xoá chương
                  </Button>
                </div>

                {/* Lessons table */}
                {(mapLessons[s._id] || []).length === 0 ? (
                  <Alert variant="light" className="d-flex align-items-center gap-2">
                    <i className="bi bi-play-circle" />
                    <span>Chưa có bài học trong chương này</span>
                  </Alert>
                ) : (
                  <div className="table-responsive" style={{ overflow: 'visible' }}>
                    <Table hover className="align-middle mb-2 lessons-list">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>#</th>
                          <th>Tiêu đề bài học</th>
                          <th style={{ width: 120 }}>Loại</th>
                          <th style={{ width: 120 }}>Thời lượng</th>
                          <th style={{ width: 120 }}>Xem trước</th>
                          <th style={{ width: 300 }}>Tài nguyên</th>
                          <th style={{ width: 140 }}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(mapLessons[s._id] || []).map((l, li) => (
                          <tr key={l._id}>
                            <td className="text-muted">{l.sortOrder ?? (li + 1)}</td>
                            <td className="fw-semibold">{l.title}</td>
                            <td>
                              <span className={`badge text-bg-light`}>{l.type || 'DEFAULT'}</span>
                            </td>
                            <td>{fmtMinutes(l.durationSec)}</td>
                            <td>
                              {l.isFreePreview ? (
                                <span className="badge text-bg-success">Miễn phí</span>
                              ) : (
                                <span className="badge text-bg-secondary">Có phí</span>
                              )}
                            </td>
                            <td>
                              {Array.isArray(l.resources) && l.resources.length > 0 ? (
                                <div className="d-flex flex-column gap-1">
                                  {l.resources.map((r, ri) => (
                                    <div key={ri} className="d-flex align-items-center gap-2">
                                      <span className="text-muted small">{r.kind || 'FILE'}</span>
                                      {r.url ? (
                                        <a
                                          href={r.viewUrl || r.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-decoration-none"
                                        >
                                          {r.title || `Tệp ${ri + 1}`} <i className="bi bi-box-arrow-up-right" />
                                        </a>
                                      ) : (
                                        <span className="text-muted">{r.title || `Tệp ${ri + 1}`}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>

                            {/* Hành động: giữ 1 dòng + dropdown overlay */}
                            <td className="lessons-actions" style={{ whiteSpace: 'nowrap' }}>
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  className="btn-icon"
                                  title="Sửa bài học"
                                  aria-label="Sửa bài học"
                                  onClick={() => openEditLesson(s._id, l)}
                                  // cố định kích thước nút để không giật layout
                                  style={{
                                    width: 32,
                                    height: 32,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0
                                  }}
                                >
                                  <i className="bi bi-pencil-square" />
                                </Button>

                                <Dropdown
                                  align="end"
                                  flip
                                  popperConfig={{
                                    strategy: 'fixed',
                                    modifiers: [
                                      { name: 'offset', options: { offset: [0, 8] } },
                                      { name: 'preventOverflow', options: { boundary: 'viewport', tether: false } }
                                    ]
                                  }}
                                >
                                  <Dropdown.Toggle
                                    size="sm"
                                    variant="outline-secondary"
                                    className="btn-icon"
                                    title="Thao tác khác"
                                    aria-label="Thao tác khác"
                                    style={{
                                      width: 42,
                                      height: 32,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding:0,
                                    }}
                                  >
                                    <i className="bi bi-three-dots" />
                                  </Dropdown.Toggle>

                                  <Dropdown.Menu style={{ zIndex: 1060 }}>
                                    <Dropdown.Item onClick={() => moveLesson(l._id, 'up')}>
                                      <i className="bi bi-arrow-up me-2" />
                                      Chuyển lên
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => moveLesson(l._id, 'down')}>
                                      <i className="bi bi-arrow-down me-2" />
                                      Chuyển xuống
                                    </Dropdown.Item>

                                    <Dropdown.Divider />

                                    {/* ✅ Tạo assessment THEO BÀI HỌC */}
                                    <Dropdown.Item onClick={() => setShowQuiz({ show: true, lessonId: l._id })}>
                                      <i className="bi bi-ui-checks-grid me-2" />
                                      Thêm Quiz cho bài học
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setShowAssignment({ show: true, lessonId: l._id })}>
                                      <i className="bi bi-file-earmark-text me-2" />
                                      Thêm Assignment cho bài học
                                    </Dropdown.Item>

                                    <Dropdown.Divider />
                                    <Dropdown.Item className="text-danger" onClick={() => removeLesson(l._id)}>
                                      <i className="bi bi-trash me-2" />
                                      Xoá bài học
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}

                {/* Section footer */}
                <div className="d-flex justify-content-end">
                  <Button variant="outline-primary" onClick={() => openCreateLesson(s._id)}>
                    <i className="bi bi-plus-circle me-1" /> Thêm bài học
                  </Button>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      {/* Modals */}
      <SectionModal
        show={showSec.show}
        mode={showSec.mode}
        courseId={courseId}
        section={showSec.section}
        onHide={() => setShowSec({ ...showSec, show: false })}
        onSaved={loadContent}
      />

      <LessonForm
        show={showLesson.show}
        courseId={courseId}
        sectionId={showLesson.sectionId}
        lesson={showLesson.lesson}
        onHide={() => setShowLesson({ ...showLesson, show: false })}
        onSaved={loadContent}
      />

      {/* 👉 Tạo theo bài học: truyền lessonId (vẫn truyền courseId nếu modal cần) */}
      <QuizCreateModal
        show={showQuiz.show}
        courseId={courseId}
        lessonId={showQuiz.lessonId}
        onHide={() => setShowQuiz({ show: false, lessonId: null })}
        onCreated={loadContent}
      />

      <AssignmentCreateModal
        show={showAssignment.show}
        courseId={courseId}
        lessonId={showAssignment.lessonId}
        onHide={() => setShowAssignment({ show: false, lessonId: null })}
        onCreated={loadContent}
      />

      <Confirm
        show={!!confirm.show}
        message={confirm.message}
        onOk={confirm.onOk}
        onCancel={() => setConfirm({ show: false })}
      />
    </>
  );
}
