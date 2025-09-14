// src/App.js
import { Routes, Route, Navigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer'

import Login from './components/Login';
import Register from './components/Register';

import { ProtectedInstructor } from './configs/auth';

import MyCourses from './components/instructor/MyCourses';
import CourseOutline from './components/instructor/CourseOutline';
import InstructorGradingHome from './components/instructor/InstructorGradingHome';
import InstructorGradingCourse from './components/instructor/InstructorGradingCourse';

import PublicCourses from './components/public/PublicCourses';
import PublicCourseDetail from './components/public/PublicCourseDetail';

import CartPage from './components/student/CartPage';
import CheckoutResult from './components/student/CheckoutResult';
import OrderHistory from './components/student/OrderHistory';
import GatewayReturnBridge from './components/student/GatewayReturnBridge';
import StudentCoursePlayer from './components/student/LearningHome.js';
import LearningHome from './components/student/LearningHome.js';
import CourseOutlineStudent from './components/student/CourseOutlineStudent.js';
import LessonView from './components/student/LessonView.js';
import Deadlines from './components/student/Deadlines.js';

export default function App() {
  return (
    <>
      <Header />
      <Container className="py-4">
        <Routes>
          {/* Landing -> trang public */}
          <Route path="/" element={<Navigate to="/courses" replace />} />
          {/* Alias: /instructor -> danh sách khoá của GV */}
          <Route path="/instructor" element={<Navigate to="/instructor/courses" replace />} />

          {/* Auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public  */}
          <Route path="/courses" element={<PublicCourses />} />
          <Route path="/courses/:idOrSlug" element={<PublicCourseDetail />} />

          {/* Student: cart & payments */}
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout/momo-return" element={<GatewayReturnBridge provider="momo" />} />
          <Route path="/checkout/vnpay-return" element={<GatewayReturnBridge provider="vnpay" />} />
          <Route path="/checkout/success" element={<CheckoutResult kind="success" />} />
          <Route path="/checkout/cancel" element={<CheckoutResult kind="cancel" />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/learning" element={<LearningHome />} />
          <Route path="/learning/course/:courseId" element={<CourseOutlineStudent />} />
          <Route path="/learning/lesson/:lessonId" element={<LessonView />} />
          <Route path="/learning/deadlines" element={<Deadlines />} />


          <Route
            path="/instructor/courses"
            element={
              <ProtectedInstructor>
                <MyCourses />
              </ProtectedInstructor>
            }
          />
          <Route
            path="/instructor/courses/:courseId"
            element={
              <ProtectedInstructor>
                <CourseOutline />
              </ProtectedInstructor>
            }
          />
          <Route
            path="/instructor/grading"
            element={
              <ProtectedInstructor>
                <InstructorGradingHome />
              </ProtectedInstructor>
            }
          />
          <Route
            path="/instructor/grading/:courseId"
            element={
              <ProtectedInstructor>
                <InstructorGradingCourse />
              </ProtectedInstructor>
            }
          />

          {/* 404 */}
          <Route path="*" element={<h4>404 Not Found</h4>} />
        </Routes>
      </Container>
      <Footer />
    </>
  );
}
