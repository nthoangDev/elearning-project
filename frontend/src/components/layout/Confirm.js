import { Modal, Button } from 'react-bootstrap';

export default function Confirm({ show, title='Xác nhận', message, onOk, onCancel }) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton><Modal.Title>{title}</Modal.Title></Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Huỷ</Button>
        <Button onClick={onOk}>Đồng ý</Button>
      </Modal.Footer>
    </Modal>
  );
}
