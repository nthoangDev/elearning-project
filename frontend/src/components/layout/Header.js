import { useContext } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Navbar, Container, Nav, Dropdown, Image } from "react-bootstrap";
import { MyUserContext } from "../../context/context";
import styles from "./Header.module.css";

export default function Header() {
  const nav = useNavigate();
  const { user, userDispatch } = useContext(MyUserContext);
  const isInstructor =
    user?.roles?.includes("INSTRUCTOR") || user?.roles?.includes("ADMIN");

  const logout = () => {
    userDispatch({ type: "logout" });
    nav("/login");
  };

  return (
    <Navbar expand="lg" className={`${styles.navbar} sticky-top`}>
      <Container>
        <Link to="/" className={`navbar-brand ${styles.brand}`}>
          <Image src="/logo_white.png" alt="E-Learning" roundedCircle width={32} height={32} />
          E-Learning
        </Link>

        <Navbar.Toggle aria-controls="main-nav" className={styles.toggle} />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            {isInstructor && (
              <>
                <NavLink
                  to="/instructor/courses"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ""}`
                  }
                >
                  Khoá dạy
                </NavLink>
                <NavLink
                  to="/instructor/grading"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ""}`
                  }
                >
                  Chấm bài
                </NavLink>
              </>
            )}
          </Nav>

          <Nav>
            {!user ? (
              <NavLink to="/login" className={styles.loginBtn}>
                <i className="bi bi-box-arrow-in-right me-2" />
                Đăng nhập
              </NavLink>
            ) : (
              <Dropdown align="end">
                <Dropdown.Toggle className={styles.dropdownToggle}>
                  <Image src={user.avatar || "/avatar_default.png"} alt="avatar" className="me-2" roundedCircle width={32} height={32} />
                  {user.fullName || user.email}
                </Dropdown.Toggle>
                <Dropdown.Menu className={styles.dropdownMenu}>
                  <Dropdown.Item onClick={logout} className={styles.dropdownItem}>
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
