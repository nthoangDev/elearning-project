import { createContext, useReducer, useCallback, useMemo } from 'react';
import MyNotificationReducer, { NotiAction } from './MyNotificationReducer';
import { authApis, endpoints } from '../configs/Apis';

function normalizeDeadlineItem(x = {}) {
  const type = (x.type || x.assessmentType || '').toUpperCase();
  return {
    _id: String(x._id || x.id || x.assessmentId || ''),
    title: x.title || x.name || 'Không có tiêu đề',
    type: type === 'QUIZ' ? 'QUIZ' : 'ASSIGNMENT',
    dueAt: x.dueAt || x.deadline || null,
    submitted: !!x.submitted,
    graded: !!x.graded,
    onTime: typeof x.onTime === 'boolean' ? x.onTime : undefined
  };
}

function normalizeDeadlineArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeDeadlineItem);
}

export const MyNotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(MyNotificationReducer, {
    reminderCount: 0,
    items: [],
    loading: false,
  });

  const fetchDeadlines = useCallback(async (withinDays = 7) => {
    dispatch({ type: NotiAction.SET_LOADING, payload: true });
    try {
      const url =
        typeof endpoints?.studentDeadlines === 'function'
          ? endpoints.studentDeadlines(withinDays)
          : `/api/student/deadlines?withinDays=${withinDays}`;

      const { data } = await authApis().get(url);

      const raw = Array.isArray(data) ? data : (data?.items || []);

      const arr = normalizeDeadlineArray(raw)
        .sort((a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0));

      dispatch({ type: NotiAction.SET_ITEMS, payload: arr });
    } catch {
      dispatch({ type: NotiAction.SET_ITEMS, payload: [] });
    } finally {
      dispatch({ type: NotiAction.SET_LOADING, payload: false });
    }
  }, []);

  const reset = useCallback(() => dispatch({ type: NotiAction.RESET }), []);
  const setCount = useCallback((n) => dispatch({ type: NotiAction.SET_COUNT, payload: n }), []);

  const value = useMemo(
    () => ({ noti: state, fetchDeadlines, reset, setCount }),
    [state, fetchDeadlines, reset, setCount]
  );

  return (
    <MyNotificationContext.Provider value={value}>
      {children}
    </MyNotificationContext.Provider>
  );
}