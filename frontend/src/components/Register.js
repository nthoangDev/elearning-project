import { useRef, useState } from "react";
import { Button, Col, Container, Row, Form, Card, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import Apis, { endpoints } from "../configs/Apis";
import MySpinner from "./layout/MySpinner";
import styles from "./Auth.module.css";

const Register = () => {
    const nav = useNavigate();
    const avatarRef = useRef();

    const [user, setUser] = useState({});
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const fields = [
        { title: "Tên đăng nhập", field: "username", type: "text", icon: "bi-person" },
        { title: "Email", field: "email", type: "email", icon: "bi-envelope" },
        { title: "Mật khẩu", field: "password", type: "password", icon: "bi-lock" },
        { title: "Xác nhận mật khẩu", field: "confirm", type: "password", icon: "bi-lock-fill" },
        { title: "Họ và tên", field: "fullName", type: "text", icon: "bi-person-badge" },
        { title: "Ảnh đại diện", field: "avatar", type: "file", icon: "bi-image" }
    ];

    const validate = () => {
        if (user.password !== user.confirm) {
            setMsg("Mật khẩu không khớp!");
            return false;
        }
        setMsg("");
        return true;
    };

    const register = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            const formData = new FormData();

            Object.entries(user).forEach(([k, v]) => {
                if (k !== "confirm") formData.append(k, v);
            });
            if (avatarRef.current?.files?.length) {
                formData.append("avatar", avatarRef.current.files[0]);
            }

            const res = await Apis.post(endpoints.register, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (res.status === 201 || res.status === 200) {
                nav("/login");
            } else {
                setMsg("Đăng ký thất bại");
            }
        } catch (err) {
            console.error(err?.message || err);
            setMsg("Đăng ký thất bại. Vui lòng thử lại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col xs={12} sm={10} md={8} lg={6} xl={5} className={styles.loginContainer}>
                    <Card className={styles.loginCard}>
                        <Card.Header className={`text-center py-4 ${styles.cardHeader}`}>
                            <h3 className={`mb-1 ${styles.headerTitle}`}>Tạo tài khoản</h3>
                            <small className={styles.headerSubtitle}>Miễn phí và nhanh chóng</small>
                        </Card.Header>

                        <Card.Body className={`px-5 py-4 ${styles.cardBody}`}>
                            {msg && (
                                <Alert variant="danger" className={`mb-4 ${styles.errorAlert}`}>
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {msg}
                                </Alert>
                            )}

                            <Form onSubmit={register}>
                                {fields.map((f) => (
                                    <div key={f.field} className="mb-4">
                                        <Form.Label className={styles.formLabel}>
                                            <i className={`bi ${f.icon} me-2 ${styles.labelIcon}`}></i>
                                            {f.title}
                                        </Form.Label>

                                        {f.type === "file" ? (
                                            <Form.Control
                                                type="file"
                                                accept="image/*"
                                                ref={avatarRef}
                                                className={styles.formInput}
                                            />
                                        ) : (
                                            <Form.Control
                                                type={f.type}
                                                name={f.field}
                                                value={user[f.field] || ""}
                                                required
                                                size="lg"
                                                placeholder={`Nhập ${f.title.toLowerCase()}`}
                                                className={styles.formInput}
                                                onChange={(e) => setUser({ ...user, [f.field]: e.target.value })}
                                            />
                                        )}
                                    </div>
                                ))}

                                {loading ? (
                                    <div className="text-center py-3">
                                        <MySpinner />
                                    </div>
                                ) : (
                                    <div className="d-grid mt-4">
                                        <Button type="submit" size="lg" className={`py-3 ${styles.loginButton}`}>
                                            <i className="bi bi-person-check me-2"></i>
                                            Đăng ký
                                        </Button>
                                    </div>
                                )}
                            </Form>
                        </Card.Body>

                        <hr className="my-0" />

                        <Card.Footer className={`text-center py-4 ${styles.cardFooter}`}>
                            <div className="mb-2">
                                <span className={styles.footerText}>
                                    Đã có tài khoản?{" "}
                                    <Link to="/login" className={styles.registerLink}>
                                        <i className="bi bi-box-arrow-in-right me-1"></i>
                                        Đăng nhập ngay
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
    );
};

export default Register;
