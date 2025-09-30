# E-Learning Platform

Nền tảng học trực tuyến cho phép người dùng **tìm kiếm – ghi danh – thanh toán** khóa học, học bài (video/PDF), làm **quiz/bài tập**, **Q&A**, **đánh giá**, và **nhận chứng chỉ** sau lộ trình. Hệ thống phân quyền **Học viên – Giảng viên – Quản trị viên** với **JWT**.

**Mục tiêu:** Hệ thống e-learning thực tiễn, dễ mở rộng, bảo mật tốt, tối ưu trải nghiệm học & quản trị.

---

## 🔗 Link Demo
- **Học viên & Giảng viên:** https://elearning-project-tau.vercel.app/courses  
- **Admin:** https://elearning-project-pzup.onrender.com/admin/login

---

## 🎯 Tính năng chính
**Học viên**
- Đăng ký/Đăng nhập (JWT + Refresh)
- Tìm kiếm/duyệt khóa, xem chi tiết
- Giỏ → Ghi danh → Thanh toán **MoMo/VNPay**
- Học video/PDF; làm quiz/bài tập, xem điểm
- Theo dõi tiến độ/lộ trình/chứng chỉ
- Q&A & đánh giá

**Giảng viên**
- Trình dựng outline (chương → bài)
- Upload video/PDF, cấu hình quiz/bài tập
- Chấm điểm & phản hồi
- Quản lý khóa học & doanh thu

**Quản trị viên**
- Quản lý user/role/permission
- Duyệt nội dung/đánh giá
- Cấu hình thanh toán, email, lưu trữ
- Báo cáo: user, doanh thu, hoàn thành

**Hệ thống**
- JWT access/refresh + middleware bảo vệ route
- Thanh toán **MoMo, VNPay** (redirect/IPN)
- Media: **Cloudinary**/S3
- Email: xác minh/OTP/biên lai
- Log & bảo mật: morgan, helmet, rate-limit
- i18n (đa ngôn ngữ UI)

---

## 🏗️ Kiến trúc & Công nghệ
- **Frontend:** React (Vite), React Router, Zustand/Redux Toolkit, Tailwind CSS  
- **Backend:** Node.js, Express.js, Mongoose • **DB:** MongoDB  
- **Auth:** JWT, bcrypt, CORS • **Payments:** MoMo/VNPay  
- **Storage:** Cloudinary
- **Build/Dev:** pnpm/npm, ESBuild/Vite • **Deploy:** Docker (tùy chọn), Render/Vercel/EC2

---

## ⚙️ Chuẩn bị môi trường
- Node.js ≥ 18, pnpm hoặc npm  
- MongoDB ≥ 5 (local/Atlas)  
- Tài khoản **Cloudinary** (khuyến nghị)  
- Sandbox **MoMo/VNPay** để test

---

## 🚀 Chạy dự án (Dev)

### Backend
```bash
cd backend
pnpm install    # hoặc npm i
pnpm dev

Frontend
cd frontend
pnpm install    # hoặc npm i
pnpm dev        # http://localhost:5173
```

API mặc định: http://localhost:8080/api
