import { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Spinner, Alert } from 'react-bootstrap';

export default function GatewayReturnBridge({ provider }) {
  const [sp] = useSearchParams();
  const nav = useNavigate();

  useEffect(() => {
    // Lấy orderId theo từng cổng
    const orderFromMoMo = sp.get('orderId') || sp.get('order') || '';
    const orderFromVnp  = sp.get('vnp_TxnRef') || sp.get('order') || '';
    const order = provider === 'momo' ? orderFromMoMo : orderFromVnp;

    // Xác định success/fail theo từng cổng
    const momoOk = sp.get('resultCode') === '0';
    const vnpOk  = (sp.get('vnp_ResponseCode') === '00') || (sp.get('vnp_TransactionStatus') === '00');

    const isSuccess = provider === 'momo' ? momoOk : vnpOk;

    // Điều hướng sang trang kết quả chuẩn của bạn
    const target = isSuccess ? `/checkout/success${order ? `?order=${order}` : ''}`
                             : `/checkout/cancel${order ? `?order=${order}` : ''}`;

    nav(target, { replace: true });
  }, [provider, nav, sp]);

  // UI tạm trong lúc chuyển trang
  return (
    <div className="py-5 text-center">
      <Spinner animation="border" className="mb-3" />
      <div>Đang xác nhận thanh toán…</div>
      <Alert variant="light" className="mt-3">
        Nếu không tự chuyển trang, bạn có thể bấm
        {' '}
        <Link to={`/checkout/success${sp.get('orderId') ? `?order=${sp.get('orderId')}` : ''}`}>vào đây</Link>.
      </Alert>
    </div>
  );
}
