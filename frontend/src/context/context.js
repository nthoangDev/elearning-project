// src/context/context.js
import { createContext, useReducer } from 'react';
import cookies from 'react-cookies';
import MyUserReducer from './MyUserReducer';
import MyCartReducer from './MyCartReducer';
import { NotificationProvider } from './NotificationContext';

export const MyUserContext = createContext();
export const MyCartContext = createContext();

export default function AppContextProvider({ children }) {
  const cookieUser = cookies.load('user');
  const [user, userDispatch] = useReducer(MyUserReducer, cookieUser || null);
  const [cartCounter, cartDispatch] = useReducer(MyCartReducer, 0);

  return (
    <MyUserContext.Provider value={{ user, userDispatch }}>
      <MyCartContext.Provider value={{ cartCounter, cartDispatch }}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </MyCartContext.Provider>
    </MyUserContext.Provider>
  );
}
