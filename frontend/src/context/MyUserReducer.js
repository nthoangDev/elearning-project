import cookies from 'react-cookies';

export default function MyUserReducer(state, action) {
  switch (action.type) {
    case 'login': {
      return action.payload;
    }
    case 'logout': {
      cookies.remove('token');
      cookies.remove('user');
      return null;
    }
    default:
      return state;
  }
}
