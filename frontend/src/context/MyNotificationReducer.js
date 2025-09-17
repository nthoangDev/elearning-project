export const NotiAction = {
  SET_COUNT: 'noti/setCount',
  SET_ITEMS: 'noti/setItems',
  SET_LOADING: 'noti/setLoading',
  RESET: 'noti/reset',
};

export default function MyNotificationReducer(state, action) {
  switch (action.type) {
    case NotiAction.SET_COUNT:
      return { ...state, reminderCount: Number(action.payload || 0) };

    case NotiAction.SET_ITEMS: {
      const arr = Array.isArray(action.payload) ? action.payload : [];
      const cnt = arr.filter((d) => !d.submitted).length;
      return { ...state, items: arr, reminderCount: cnt };
    }

    case NotiAction.SET_LOADING:
      return { ...state, loading: !!action.payload };

    case NotiAction.RESET:
      return { reminderCount: 0, items: [], loading: false };

    default:
      return state;
  }
}
