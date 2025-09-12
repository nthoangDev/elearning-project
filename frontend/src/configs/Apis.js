import axios from 'axios';
import cookie from 'react-cookies';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
// const BASE_URL = 'https://fab736920085.ngrok-free.app';

export const endpoints = {
  // Auth
  login: '/auth/login',
  profile: '/auth/me',
  register: '/auth/register',

  // Instructor - courses & outline
  instructorMyCourses: '/api/instructor/my-courses',
  courseContent: (courseId) => `/api/instructor/courses/${courseId}/content`,   // GET
  courseOutline: (courseId) => `/api/instructor/courses/${courseId}/content`,   // alias

  // Sections
  sectionsByCourse: (courseId) => `/api/instructor/courses/${courseId}/sections`,                 // GET(list) / POST(create)
  sectionById: (courseId, sectionId) => `/api/instructor/courses/${courseId}/sections/${sectionId}`, // PUT / DELETE
  moveSection: (courseId, sectionId) => `/api/instructor/courses/${courseId}/sections/${sectionId}/move`, // PATCH

  // Lessons
  lessonsBySection: (courseId, sectionId) => `/api/instructor/courses/${courseId}/sections/${sectionId}/lessons`, // GET/POST
  lessonById: (lessonId) => `/api/instructor/lessons/${lessonId}`,  // GET / PUT / DELETE
  instructorLessonDetail: (lessonId) => `/api/instructor/lessons/${lessonId}`, // alias

  // Students of a course
  courseStudents: (courseId) => `/api/instructor/courses/${courseId}/students`,

  // Assessments (ADD these)
  createAssignment: (lessonId) => `/api/instructor/lessons/${lessonId}/assessments/assignment`, // POST
  createQuiz: (lessonId) => `/api/instructor/lessons/${lessonId}/assessments/quiz`, // POST
  updateAssessment: (assessmentId) => `/api/instructor/assessments/${assessmentId}`, // PUT
  deleteAssessment: (assessmentId) => `/api/instructor/assessments/${assessmentId}`, // DELETE
  attachAssessmentToLesson: (lessonId, assessmentId) => `/api/instructor/lessons/${lessonId}/assessments/${assessmentId}/attach`, // POST

  // Submissions / grading / comments
  assessmentSubmissions: (assessmentId) => `/api/instructor/assessments/${assessmentId}/submissions`, // GET
  submissionDetail: (submissionId) => `/api/instructor/submissions/${submissionId}`, // GET
  gradeSubmission: (submissionId) => `/api/instructor/submissions/${submissionId}/grade`, // POST
  commentSubmission: (submissionId) => `/api/instructor/submissions/${submissionId}/comments`, // POST

  // Public
  listCourses: '/api/public/courses',
  courseDetail: (idOrSlug) => `/api/public/courses/${idOrSlug}`,

  // Cart
  studentCart: '/api/student/cart',
  addToCart: '/api/student/cart/add',
  removeCartCourse: (courseId) => `/api/student/cart/course/${courseId}`,
  setCartQuantity: '/api/student/cart/quantity',

  // Checkout
  createMoMoPayment: '/api/student/checkout/momo/create',
  createVnpayPayment: '/api/student/checkout/vnpay/create',

  // Orders
  studentOrders: '/api/student/orders',
};

// Axios instances
export default axios.create({
  baseURL: BASE_URL,
  headers: { 'ngrok-skip-browser-warning': 'true' } // Bỏ qua cảnh báo của ngrok free
});

export const authApis = () =>
  axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${cookie.load('token')}`, 'ngrok-skip-browser-warning': 'true' },
  });
