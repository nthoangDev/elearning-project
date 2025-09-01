import { createContext, useReducer } from 'react';
import cookies from 'react-cookies';
import MyUserReducer from '../context/MyUserReducer';
import MyCartReducer from '../context/MyCartReducer';
import MyNotificationReducer from '../context/MyNotificationReducer';

export const MyUserContext = createContext();
export const MyCartContext = createContext();
export const MyNotificationContext = createContext();

export default function AppContextProvider({ children }) {
  const cookieUser = cookies.load('user');
  const [user, userDispatch] = useReducer(MyUserReducer, cookieUser || null);
  const [cartCounter, cartDispatch] = useReducer(MyCartReducer, 0);
  const [noti, notiDispatch] = useReducer(MyNotificationReducer, { reminderCount: 0 });

  return (
    <MyUserContext.Provider value={{ user, userDispatch }}>
      <MyCartContext.Provider value={{ cartCounter, cartDispatch }}>
        <MyNotificationContext.Provider value={{ noti, notiDispatch }}>
          {children}
        </MyNotificationContext.Provider>
      </MyCartContext.Provider>
    </MyUserContext.Provider>
  );
}
