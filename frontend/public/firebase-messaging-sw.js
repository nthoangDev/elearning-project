// public/firebase-messaging-sw.js

// Dùng compat trong SW cho nhanh gọn
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Khớp config với app web (có thể hardcode hoặc build-time inject)
firebase.initializeApp({
  apiKey: "AIzaSyAUdoDKRCpwmmQFt2F2LvDaYJLMyh7ANWQ",
  authDomain: "e-learning-project-5b2cc.firebaseapp.com",
  projectId: "e-learning-project-5b2cc",
  messagingSenderId: "782134102899",
  appId: "1:782134102899:web:ba7af01a293c981bf85306",
});

// Bắt buộc phải khởi tạo messaging trong SW
const messaging = firebase.messaging();

// (tuỳ chọn) handle background messages
messaging.onBackgroundMessage((payload) => {
  // Customize hiển thị notification khi app ở background
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Notification", {
    body: body || "",
    icon: icon || "/icons/icon-192.png",
  });
});
