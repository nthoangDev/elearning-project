import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Row, Col, Image, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { authApis, endpoints } from '../../configs/Apis';
import './cart.css';

export default function CartPage() {
  const nav = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const api = useMemo(() => authApis(), []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(endpoints.studentCart);
      setCart(r.data || { items: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const items = cart?.items || [];
  const calcItemPrice = (it) => {
    const c = it.course;
    const unit = (typeof c?.salePrice === 'number' ? c.salePrice : c?.price) || 0;
    return unit * (it.quantity || 1);
  };
  const total = items.reduce((s, it) => s + calcItemPrice(it), 0);

  const changeQty = async (courseId, qty) => {
    if (qty < 1) return;
    setBusy(true);
    try {
      await api.put(endpoints.setCartQuantity, { courseId, quantity: qty });
      await load();
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const removeItem = async (courseId) => {
    setBusy(true);
    try {
      await api.delete(endpoints.removeCartCourse(courseId));
      await load();
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const goPay = async (provider) => {
    if (!items.length) return;
    setBusy(true);
    try {
      const urlEndpoint = provider === 'MOMO' ? endpoints.createMoMoPayment : endpoints.createVnpayPayment;
      const r = await api.post(urlEndpoint);
      const url = r.data?.url;
      if (url) {
        window.location.href = url; // redirect sang cổng thanh toán
      } else {
        alert('Không lấy được URL thanh toán.');
      }
    } catch (e) {
      console.error(e);
      alert('Không khởi tạo thanh toán. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  if (!items.length) {
    return (
      <div className="cart-empty">
        <Image src="/empty_cart.svg" alt="" width={160} className="mb-3"/>
        <h4>Giỏ hàng trống</h4>
        <p>Hãy khám phá các khoá học thú vị nhé!</p>
        <Button as={Link} to="/courses" variant="primary">Xem khoá học</Button>
      </div>
    );
  }

  return (
    <Row className="g-4">
      <Col lg={8}>
        {items.map((it) => (
          <Card className="cart-item" key={it.course?._id}>
            <Card.Body className="d-flex gap-3 align-items-center">
              <Image
                src={it.course?.imageUrl || '/course_placeholder.jpg'}
                alt={it.course?.title}
                rounded
                width={96}
                height={64}
                style={{ objectFit: 'cover' }}
              />
              <div className="flex-grow-1">
                <div className="fw-bold">{it.course?.title}</div>
                <div className="text-muted small">{it.course?.currency || 'VND'}</div>
                <div className="qty-row mt-2">
                  <Button
                    size="sm"
                    variant="light"
                    disabled={busy}
                    onClick={() => changeQty(it.course._id, (it.quantity || 1) - 1)}
                  >−</Button>
                  <span className="qty">{it.quantity || 1}</span>
                  <Button
                    size="sm"
                    variant="light"
                    disabled={busy}
                    onClick={() => changeQty(it.course._id, (it.quantity || 1) + 1)}
                  >＋</Button>
                </div>
              </div>

              <div className="text-end">
                <div className="price">
                  {calcItemPrice(it).toLocaleString('vi-VN')} đ
                </div>
                <Button
                  size="sm"
                  variant="outline-danger"
                  disabled={busy}
                  className="mt-2"
                  onClick={() => removeItem(it.course._id)}
                >
                  <i className="bi bi-trash me-1" /> Xoá
                </Button>
              </div>
            </Card.Body>
          </Card>
        ))}
      </Col>

      <Col lg={4}>
        <Card className="cart-summary">
          <Card.Body>
            <div className="d-flex justify-content-between mb-2">
              <span>Tạm tính</span>
              <strong>{total.toLocaleString('vi-VN')} đ</strong>
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span>Giảm giá</span>
              <strong>0 đ</strong>
            </div>
            <div className="d-flex justify-content-between border-top pt-3 mb-3">
              <span className="fw-bold">Tổng cộng</span>
              <span className="total">{total.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="d-grid gap-2">
              <Button
                size="lg"
                variant="warning"
                disabled={busy}
                onClick={() => goPay('MOMO')}
              >
                <img src="/momo.svg" alt="" width={22} className="me-2" />
                Thanh toán MoMo
              </Button>
              <Button
                size="lg"
                variant="primary"
                disabled={busy}
                onClick={() => goPay('VNPAY')}
              >
                <img src="/vnpay.svg" alt="" width={22} className="me-2" />
                Thanh toán VNPAY
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => nav('/courses')}
              >
                Tiếp tục mua sắm
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
