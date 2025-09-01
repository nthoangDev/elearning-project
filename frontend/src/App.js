import { Routes, Route, Navigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Header from './components/layout/Header';
import Login from './components/Login';
import MyCourses from './components/instructor/MyCourses';
import CourseOutline from './components/instructor/CourseOutline';
import { ProtectedInstructor } from './configs/auth';
import Register from './components/Register';
import InstructorGradingHome from "./components/instructor/InstructorGradingHome";
import InstructorGradingCourse from "./components/instructor/InstructorGradingCourse";

export default function App() {
  return (
    <>
      <Header />
      <Container className="py-4">
        <Routes>
          <Route path="/" element={<Navigate to="/instructor/courses" />} />
          <Route path="/login" element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path="/instructor/courses" element={
            <ProtectedInstructor>
              <MyCourses />
            </ProtectedInstructor>
          } />
          <Route path="/instructor/courses/:courseId" element={
            <ProtectedInstructor>
              <CourseOutline />
            </ProtectedInstructor>
          } />
          <Route path="/instructor/grading" element={
            <ProtectedInstructor>
              <InstructorGradingHome />
            </ProtectedInstructor>
          } />
          <Route path="/instructor/grading/:courseId" element={
            <ProtectedInstructor>
              <InstructorGradingCourse />
            </ProtectedInstructor>
          } />
          <Route path="*" element={<h4>404 Not Found</h4>} />
        </Routes>
      </Container>
    </>
  );
}
