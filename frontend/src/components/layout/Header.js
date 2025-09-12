import { useContext, useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Navbar, Container, Nav, Dropdown, Image } from "react-bootstrap";
import { MyUserContext } from "../../context/context";
import styles from "./Header.module.css";
import axios, { endpoints } from "../../configs/Apis";

const SITE = {
  name: "ELearnPro",
  tagline: "E-LEARNING SYSTEM",
};

export default function Header() {
  const nav = useNavigate();
  const { user, userDispatch } = useContext(MyUserContext);
  const isInstructor =
    user?.roles?.includes("INSTRUCTOR") || user?.roles?.includes("ADMIN");

  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setTopicsLoading(true);
        const url =
          (endpoints && endpoints.listTopics) || "/api/public/topics";
        const res = await axios.get(url);
        const arr = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        if (alive) setTopics(arr);
      } catch {
        if (alive) setTopics([]);
      } finally {
        if (alive) setTopicsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const gotoTopic = (slugOrId) => {
    if (!slugOrId) {
      nav("/courses");
      return;
    }
    nav(`/courses?topic=${encodeURIComponent(slugOrId)}`);
  };

  const logout = () => {
    userDispatch({ type: "logout" });
    nav("/login");
  };

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
          <button className={styles.iconBtn} aria-label="Cart">
            <i className="bi bi-bag" />
          </button>
          <button className={styles.iconBtn} aria-label="Search">
            <i className="bi bi-search" />
          </button>
          <Navbar.Toggle aria-controls="main-nav" className={styles.toggle} />
        </div>

        <Navbar.Collapse id="main-nav">
          {/* Primary navigation (center) */}
          <Nav className={`mx-auto ${styles.primaryNav}`}>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <i className="bi bi-house me-2" />
              Home
            </NavLink>

            <Dropdown align="start">
              <Dropdown.Toggle
                id="topics-dropdown"
                className={`${styles.navLink} ${styles.dropdownToggleLikeLink}`}
              >
                <i className="bi bi-grid me-2" />
                Chủ đề
              </Dropdown.Toggle>
              {/* UPDATED: Changed className to dropdownMenu for consistency */}
              <Dropdown.Menu className={styles.dropdownMenu}>
                {topicsLoading && (
                  <Dropdown.ItemText className="text-muted px-3">
                    Đang tải…
                  </Dropdown.ItemText>
                )}
                {!topicsLoading && topics.length === 0 && (
                  <Dropdown.ItemText className="text-muted px-3">
                    Chưa có chủ đề
                  </Dropdown.ItemText>
                )}
                {!topicsLoading &&
                  topics.map((t) => (
                    // UPDATED: Added className for consistent styling
                    <Dropdown.Item
                      key={t._id || t.slug}
                      onClick={() => gotoTopic(t.slug || t._id)}
                      className={styles.dropdownItem}
                    >
                      {t.name}
                    </Dropdown.Item>
                  ))}
                <Dropdown.Divider />
                {/* UPDATED: Added className for consistent styling */}
                <Dropdown.Item onClick={() => gotoTopic("")} className={styles.dropdownItem}>
                  Tất cả chủ đề
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            {isInstructor && (
              <>
                <NavLink
                  to="/instructor/courses"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ""}`
                  }
                >
                  <i className="bi bi-mortarboard me-2" />
                  Khoá dạy
                </NavLink>
                <NavLink
                  to="/instructor/grading"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ""}`
                  }
                >
                  <i className="bi bi-clipboard-check me-2" />
                  Chấm bài
                </NavLink>
              </>
            )}
          </Nav>

          {/* Actions (right) */}
          <Nav className={styles.actions}>
            <div className={styles.actionGroup}>
              <Link to={'/cart'} className={styles.iconBtn} aria-label="Cart">
                <i className="bi bi-bag" />
                <span className={styles.badge}>3</span>
              </Link>
              <button className={styles.iconBtn} aria-label="Search">
                <i className="bi bi-search" />
              </button>
            </div>

            {!user ? (
              <NavLink to="/login" className={styles.loginBtn}>
                <i className="bi bi-box-arrow-in-right me-2" />
                Đăng nhập
              </NavLink>
            ) : (
              <Dropdown align="end">
                <Dropdown.Toggle className={styles.dropdownToggle}>
                  <div className={styles.userAvatar}>
                    <img
                      src={user.avatar || "/avatar_default.png"}
                      alt="avatar"
                      className={styles.avatarImg}
                    />
                    <div className={styles.onlineStatus}></div>
                  </div>
                  <span className={styles.userName}>
                    {user.fullName || user.email}
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className={styles.dropdownMenu}>
                  <div className={styles.userInfo}>
                    <img
                      src={user.avatar || "/avatar_default.png"}
                      alt="avatar"
                      className={styles.dropdownAvatar}
                    />
                    <div>
                      <div className={styles.dropdownUserName}>
                        {user.fullName || user.email}
                      </div>
                      <div className={styles.dropdownUserEmail}>
                        {user.email}
                      </div>
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

                  <Dropdown.Item
                    onClick={logout}
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                  >
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
