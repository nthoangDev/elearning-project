export default function MyNotificationReducer(state, action) {
  switch (action.type) {
    case 'setReminderCount':
      return { ...state, reminderCount: Number(action.payload || 0) };
    default:
      return state;
  }
}
