export default function MyCartReducer(state, action) {
  switch (action.type) {
    case 'update':
      return Number(action.payload || 0);
    default:
      return state;
  }
}
