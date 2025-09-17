import { useContext, useState } from "react";
import { Button, Col, Container, Row, Form, Card, Alert } from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Apis, { authApis, endpoints } from "../configs/Apis";
import cookie from "react-cookies";
import { MyUserContext } from "../context/context";
import MySpinner from "./layout/MySpinner";
import styles from "./Auth.module.css";

const Login = () => {
  const { userDispatch } = useContext(MyUserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();
  const [q] = useSearchParams();

  const [creds, setCreds] = useState({ email: "", password: "" });

  const info = [
    { title: "Email", field: "email", type: "email" },
    { title: "Mật khẩu", field: "password", type: "password" }
  ];

  const login = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const res = await Apis.post(endpoints.login, { ...creds });
      cookie.save("token", res.data.accessToken, { path: '/' });

      console.log(cookie.load("token"))
      const u = await authApis().get(endpoints.profile);

      userDispatch({
        type: 'login',
        payload: u.data
      });

      cookie.save("user", u.data, { path: '/' });

      const next = q.get("next");
      nav(next ? next : "/");
    } catch (err) {
      console.error(err?.message || err);
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5} className={styles.loginContainer}>
            <Card className={styles.loginCard}>
              <Card.Header className={`text-center py-4 ${styles.cardHeader}`}>
                <div className="mb-3">
                  <i className={`bi bi-shield-check-fill ${styles.headerIcon}`}></i>
                </div>
                <h3 className={`mb-1 ${styles.headerTitle}`}>Chào mừng trở lại</h3>
                <small className={styles.headerSubtitle}>Đăng nhập để tiếp tục sử dụng dịch vụ</small>
              </Card.Header>

              <Card.Body className={`px-5 py-4 ${styles.cardBody}`}>
                {error && (
                  <Alert variant="danger" className={`mb-4 ${styles.errorAlert}`}>
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={login}>
                  {info.map((inf) => (
                    <div key={inf.field} className="mb-4">
                      <Form.Label className={styles.formLabel}>
                        <i className={`bi ${inf.field === 'email' ? 'bi-envelope' : 'bi-lock'} me-2 ${styles.labelIcon}`}></i>
                        {inf.title}
                      </Form.Label>
                      <Form.Control
                        type={inf.type}
                        name={inf.field}
                        value={creds[inf.field] || ""}
                        required
                        size="lg"
                        placeholder={`Nhập ${inf.title.toLowerCase()} của bạn`}
                        className={styles.formInput}
                        onChange={(e) =>
                          setCreds({ ...creds, [inf.field]: e.target.value })
                        }
                      />
                    </div>
                  ))}

                  <div className="d-flex justify-content-end mb-4">
                    <Link to="/forgot-password" className={`small ${styles.forgotLink}`}>
                      <i className="bi bi-question-circle me-1"></i>
                      Quên mật khẩu?
                    </Link>
                  </div>

                  {loading ? (
                    <div className="text-center py-3">
                      <MySpinner />
                    </div>
                  ) : (
                    <div className="d-grid mt-4">
                      <Button
                        type="submit"
                        size="lg"
                        className={`py-3 ${styles.loginButton}`}
                      >
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Đăng nhập
                      </Button>
                    </div>
                  )}
                </Form>
              </Card.Body>

              <hr className="my-0" />

              <Card.Footer className={`text-center py-4 ${styles.cardFooter}`}>
                <div className="mb-3">
                  <span className={styles.footerText}>
                    Chưa có tài khoản? {' '}
                    <Link to="/register" className={styles.registerLink}>
                      <i className="bi bi-person-plus me-1"></i>
                      Đăng ký ngay
                    </Link>
                  </span>
                </div>

                <div className={styles.securityText}>
                  <small>
                    <i className="bi bi-shield-lock me-1"></i>
                    Thông tin của bạn được bảo mật tuyệt đối
                  </small>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default Login;