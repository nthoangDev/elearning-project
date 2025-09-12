// src/components/student/OrderHistory.jsx
import { useEffect, useMemo, useState } from 'react';
import { authApis, endpoints } from '../../configs/Apis';
import { Badge, Card, Spinner, Container, ListGroup, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

// Function để chọn màu cho trạng thái đơn hàng
const getStatusVariant = (status) => {
  switch (status) {
    case 'PAID': return 'success';
    case 'PENDING': return 'warning';
    case 'FAILED': return 'danger';
    case 'REFUNDED': return 'info';
    default: return 'secondary';
  }
};

// Component cho trạng thái đang tải
const LoadingState = () => (
  <div className="text-center py-5">
    <Spinner animation="border" variant="primary" />
    <p className="mt-2 text-muted">Đang tải lịch sử mua hàng...</p>
  </div>
);

// Component cho trạng thái rỗng (chưa có đơn hàng)
const EmptyState = () => (
  <Card className="text-center shadow-sm border-0">
    <Card.Body className="p-5">
      <div style={{ fontSize: '3rem' }}>🛒</div>
      <Card.Title as="h4" className="mt-3">Bạn chưa có đơn hàng nào</Card.Title>
      <Card.Text className="text-muted mb-4">
        Hãy bắt đầu khám phá và lựa chọn những khóa học bổ ích cho riêng mình.
      </Card.Text>
      <Button as={Link} to="/courses" variant="primary" size="lg">
        Khám phá khoá học
      </Button>
    </Card.Body>
  </Card>
);

export default function OrderHistory() {
  const api = useMemo(() => authApis(), []);
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get(endpoints.studentOrders);
        setOrders(Array.isArray(res.data) ? res.data : (res.data?.items || []));
      } catch (err) {
        console.error(err);
        setOrders([]); // Set to empty array on error to avoid infinite loading
      }
    };
    fetchOrders();
  }, [api]);

  if (orders === null) {
    return <LoadingState />;
  }

  return (
    <Container className="py-4 py-md-5">
      <Row className="justify-content-center">
        <Col lg={10} xl={8}>
          <h2 className="mb-4 text-center">Lịch sử mua hàng</h2>
          {orders.length === 0 ? (
            <EmptyState />
          ) : (
            <Card className="shadow-sm">
              <ListGroup variant="flush">
                {orders.map((order) => (
                  <ListGroup.Item key={order._id} className="p-3">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                      {/* Thông tin đơn hàng */}
                      <div>
                        <h5 className="mb-1 fw-bold">
                          Đơn hàng #{order._id.substring(order._id.length - 8).toUpperCase()}
                        </h5>
                        <p className="text-muted small mb-1 mb-sm-0">
                          Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
                          <span className="mx-2 d-none d-sm-inline">|</span>
                          <br className="d-sm-none" />
                          {order.items?.length || 0} sản phẩm
                        </p>
                      </div>
                      {/* Tổng tiền và trạng thái */}
                      <div className="text-sm-end mt-2 mt-sm-0">
                        <h5 className="fw-bold mb-1">
                          {Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ
                        </h5>
                        <Badge pill bg={getStatusVariant(order.status)} className="px-2 py-1 fs-6">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}