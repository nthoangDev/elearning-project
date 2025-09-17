// components/Header/Header.jsx
import { useContext, useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { Navbar, Container, Nav, Dropdown, Image } from "react-bootstrap";
import { MyUserContext } from "../../context/context";
import { MyNotificationContext } from "../../context/NotificationContext"; // ✅
import styles from "./Header.module.css";
import axios, { authApis, endpoints } from "../../configs/Apis";
import useFCM from "../../hooks/useFCM";

const SITE = { name: "ELearnPro", tagline: "E-LEARNING SYSTEM" };

export default function Header() {
  const nav = useNavigate();
  const location = useLocation();

  const { user, userDispatch } = useContext(MyUserContext);
  const { noti, fetchDeadlines, reset: resetNoti } = useContext(MyNotificationContext); // ✅

  const isInstructor = user?.roles?.includes("INSTRUCTOR") || user?.roles?.includes("ADMIN");
  const isStudent = user?.roles?.includes("STUDENT");

  // topics
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // cart
  const [cartCount, setCartCount] = useState(0);
  const showCartBadge = cartCount > 0;

  // load topics (public)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setTopicsLoading(true);
        const url = (endpoints && endpoints.listTopics) || "/api/public/topics";
        const res = await axios.get(url);
        const arr = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (alive) setTopics(arr);
      } catch {
        if (alive) setTopics([]);
      } finally {
        if (alive) setTopicsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // cart count
  const fetchCartCount = async () => {
    if (!user) { setCartCount(0); return; }
    try {
      const url = (endpoints && endpoints.studentCart) || "/api/student/cart";
      const res = await authApis().get(url);
      const items = res?.data?.items || [];
      const total = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0) || items.length || 0;
      setCartCount(total);
    } catch { setCartCount(0); }
  };

  useEffect(() => {
    fetchCartCount();
    if (user) fetchDeadlines(7);
    else resetNoti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname]);

  const gotoTopic = (slugOrId) => {
    if (!slugOrId) return nav("/courses");
    nav(`/courses?topic=${encodeURIComponent(slugOrId)}`);
  };

  const logout = () => {
    userDispatch({ type: "logout" });
    resetNoti(); 
    nav("/login");
  };

  const showBellBadge = (noti?.reminderCount || 0) > 0;

  const fmtDue = (iso) => {
    if (!iso) return "Không rõ hạn";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  useFCM({ onDeadline: () => fetchDeadlines?.(7) });

  const BellDropdown = () => (
    <Dropdown align="end">
      <Dropdown.Toggle className={styles.iconBtn} aria-label="Thông báo deadline">
        <i className="bi bi-bell" />
        {showBellBadge && <span className={styles.badge}>{noti?.reminderCount || 0}</span>}
      </Dropdown.Toggle>
      <Dropdown.Menu className={styles.dropdownMenu}>
        <div className="px-3 pt-2 pb-2 fw-bold">Thông báo Deadline</div>
        <Dropdown.Divider />
        {noti?.loading && (
          <Dropdown.ItemText className="text-muted px-3">Đang tải…</Dropdown.ItemText>
        )}
        {!noti?.loading && (noti?.items?.length || 0) === 0 && (
          <Dropdown.ItemText className="text-muted px-3">
            Không có deadline trong 7 ngày tới
          </Dropdown.ItemText>
        )}
        {!noti?.loading &&
          (noti?.items || []).slice(0, 8).map((d) => (
            <Dropdown.Item
              key={d._id}
              onClick={() => nav(`/learning/deadlines?focus=${encodeURIComponent(d._id)}`)}
              className={styles.dropdownItem}
            >
              <div className="d-flex flex-column">
                <span className="fw-semibold">
                  {d.title}{" "}
                  <span className="text-uppercase small ms-1">
                    {d.type === "QUIZ" ? "Quiz" : "Assignment"}
                  </span>
                </span>
                <span className="small text-muted">
                  Hạn: {fmtDue(d.dueAt)} • {d.submitted ? "Đã nộp" : "Chưa nộp"}
                  {d.graded ? " • Đã chấm" : ""}
                </span>
              </div>
            </Dropdown.Item>
          ))}
        {(noti?.items?.length || 0) > 0 && (
          <>
            <Dropdown.Divider />
            <Dropdown.Item as={Link} to="/learning/deadlines" className={styles.dropdownItem}>
              Xem tất cả deadline
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );

  return (
    <Navbar expand="lg" className={`${styles.navbar} sticky-top`}>
      <Container>
        {/* Brand */}
        <Link to="/" className={`navbar-brand ${styles.brand}`} aria-label={SITE.name}>
          <div className={styles.logoContainer}>
            <Image src="/logo_white.png" alt="logo" className={styles.logo} />
          </div>
          <span className={styles.brandText}>
            <span className={styles.brandName}>{SITE.name}</span>
            <span className={styles.brandSub}>{SITE.tagline}</span>
          </span>
        </Link>

        {/* Mobile right cluster */}
        <div className={styles.rightClusterMobile}>
          {user && <BellDropdown />}

          <Link to="/cart" className={styles.iconBtn} aria-label="Cart">
            <i className="bi bi-bag" />
            {showCartBadge && <span className={styles.badge}>{cartCount}</span>}
          </Link>

          <button className={styles.iconBtn} aria-label="Search" onClick={() => nav("/courses")}>
            <i className="bi bi-search" />
          </button>
          <Navbar.Toggle aria-controls="main-nav" className={styles.toggle} />
        </div>

        <Navbar.Collapse id="main-nav">
          {/* Center nav */}
          <Nav className={`mx-auto ${styles.primaryNav}`}>
            <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`}>
              <i className="bi bi-house me-2" />
              Home
            </NavLink>

            {/* Topics */}
            <Dropdown align="start">
              <Dropdown.Toggle id="topics-dropdown" className={`${styles.navLink} ${styles.dropdownToggleLikeLink}`}>
                <i className="bi bi-grid me-2" />
                Chủ đề
              </Dropdown.Toggle>
              <Dropdown.Menu className={styles.dropdownMenu}>
                {topicsLoading && (
                  <Dropdown.ItemText className="text-muted px-3">Đang tải…</Dropdown.ItemText>
                )}
                {!topicsLoading && topics.length === 0 && (
                  <Dropdown.ItemText className="text-muted px-3">Chưa có chủ đề</Dropdown.ItemText>
                )}
                {!topicsLoading &&
                  topics.map((t) => (
                    <Dropdown.Item
                      key={t._id || t.slug}
                      onClick={() => gotoTopic(t.slug || t._id)}
                      className={styles.dropdownItem}
                    >
                      {t.name}
                    </Dropdown.Item>
                  ))}
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => gotoTopic("")} className={styles.dropdownItem}>
                  Tất cả chủ đề
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            {/* Student group */}
            {user && (isStudent || !isInstructor) && (
              <Dropdown align="start">
                <Dropdown.Toggle id="learning-dropdown" className={`${styles.navLink} ${styles.dropdownToggleLikeLink}`}>
                  <i className="bi bi-journal-check me-2" />
                  Học tập
                </Dropdown.Toggle>
                <Dropdown.Menu className={styles.dropdownMenu}>
                  <Dropdown.Item as={Link} to="/learning" className={styles.dropdownItem}>
                    Khóa học của tôi
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Instructor group */}
            {isInstructor && (
              <Dropdown align="start">
                <Dropdown.Toggle id="instructor-dropdown" className={`${styles.navLink} ${styles.dropdownToggleLikeLink}`}>
                  <i className="bi bi-mortarboard me-2" />
                  Giảng dạy
                </Dropdown.Toggle>
                <Dropdown.Menu className={styles.dropdownMenu}>
                  <Dropdown.Item as={Link} to="/instructor/courses" className={styles.dropdownItem}>
                    Khoá dạy
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/instructor/grading" className={styles.dropdownItem}>
                    Chấm bài
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </Nav>

          {/* Right actions */}
          <Nav className={styles.actions}>
            {user && <BellDropdown />}

            <Link to="/cart" className={styles.iconBtn} aria-label="Cart">
              <i className="bi bi-bag" />
              {showCartBadge && <span className={styles.badge}>{cartCount}</span>}
            </Link>

            <button className={styles.iconBtn} aria-label="Search" onClick={() => nav("/courses")}>
              <i className="bi bi-search" />
            </button>

            {!user ? (
              <>
                <NavLink to="/login" className={styles.loginBtn}>
                  <i className="bi bi-box-arrow-in-right me-2" />
                  Đăng nhập
                </NavLink>
                <NavLink to="/register" className={styles.loginBtn} style={{ marginLeft: 8 }}>
                  <i className="bi bi-person-plus me-2" />
                  Đăng ký
                </NavLink>
              </>
            ) : (
              <Dropdown align="end">
                <Dropdown.Toggle className={styles.dropdownToggle}>
                  <div className={styles.userAvatar}>
                    <img src={user.avatar || "/avatar_default.png"} alt="avatar" className={styles.avatarImg} />
                    <div className={styles.onlineStatus}></div>
                  </div>
                  <span className={styles.userName}>{user.fullName || user.email}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className={styles.dropdownMenu}>
                  <div className={styles.userInfo}>
                    <img src={user.avatar || "/avatar_default.png"} alt="avatar" className={styles.dropdownAvatar} />
                    <div>
                      <div className={styles.dropdownUserName}>{user.fullName || user.email}</div>
                      <div className={styles.dropdownUserEmail}>{user.email}</div>
                    </div>
                  </div>
                  <Dropdown.Divider />
                  <Dropdown.Item as={Link} to="/profile" className={styles.dropdownItem}>
                    <i className="bi bi-person me-2" />
                    Hồ sơ cá nhân
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/orders" className={styles.dropdownItem}>
                    <i className="bi bi-bag-check me-2" />
                    Lịch sử đơn hàng
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/settings" className={styles.dropdownItem}>
                    <i className="bi bi-gear me-2" />
                    Cài đặt
                  </Dropdown.Item>
                  <Dropdown.Item onClick={logout} className={`${styles.dropdownItem} ${styles.logoutItem}`}>
                    <i className="bi bi-box-arrow-right me-2" />
                    Đăng xuất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
