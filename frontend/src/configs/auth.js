import { useContext } from 'react';
import { MyUserContext } from '../context/context';

export function ProtectedInstructor({ children }) {
  const { user } = useContext(MyUserContext);
  if (!user) return <p className="text-danger">Vui lòng đăng nhập.</p>;
  const roles = user.roles || [];
  const ok = roles.includes('INSTRUCTOR') || roles.includes('ADMIN');
  if (!ok) return <p className="text-danger">Bạn không có quyền truy cập.</p>;
  return children;
}
