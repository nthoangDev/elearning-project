import { Col, Container, Row } from "react-bootstrap";

const Footer = () => {
    return (
        <>
            <footer className="bg-dark text-light py-4 mt-5 border-top border-secondary">
                <Container>
                    <Row className="align-items-center">
                        <Col md={6}>
                            <p className="mb-0">&copy; 2025 <strong>E-LearninG</strong>. All rights reserved.</p>
                        </Col>
                        <Col md={6} className="text-md-end mt-3 mt-md-0">
                            <a href="/about" className="text-light me-4 text-decoration-none">Giới thiệu</a>
                            <a href="/contact" className="text-light text-decoration-none">Liên hệ</a>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </>
    );
}

export default Footer;