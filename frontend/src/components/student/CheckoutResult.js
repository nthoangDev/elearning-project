// src/components/student/CheckoutResult.jsx
import { Alert, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

export default function CheckoutResult({ kind }) {
  const [sp] = useSearchParams();
  const loc = useLocation();
  const order = sp.get('order') || '';

  const isSuccess = kind === 'success';

  const successInfo = {
    icon: '🎉',
    title: 'Thanh toán thành công',
    message: 'Cảm ơn bạn đã mua khóa học. Chúng tôi đã gửi thông tin chi tiết vào email của bạn.',
    variant: 'success',
  };

  const failureInfo = {
    icon: '⚠️',
    title: 'Thanh toán chưa hoàn tất',
    message: order
      ? 'Giao dịch chưa được hoàn thành hoặc đã bị hủy. Bạn có thể thử lại sau.'
      : 'Không tìm thấy thông tin thanh toán. Bạn có thể quay lại và thử lại.',
    variant: 'warning',
  };

  const info = isSuccess ? successInfo : failureInfo;

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="text-center shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <div className="display-1 mb-3">{info.icon}</div>
              <Card.Title as="h2" className="mb-3">
                {info.title}
              </Card.Title>
              <Card.Text className="text-muted mb-4">{info.message}</Card.Text>

              {order && (
                <Alert variant={info.variant} className="d-inline-block">
                  Mã đơn hàng của bạn: <strong>{order}</strong>
                </Alert>
              )}

              <hr className="my-4" />

              <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                <Button as={Link} to="/courses" variant="outline-secondary" size="lg">
                  Tiếp tục xem khoá học
                </Button>
                <Button as={Link} to="/orders" variant="primary" size="lg">
                  Xem lịch sử mua
                </Button>
              </div>
            </Card.Body>
          </Card>
          <div className="mt-4 text-center text-muted small">
            <code>{loc.pathname}{loc.search}</code>
          </div>
        </Col>
      </Row>
    </Container>
  );
}