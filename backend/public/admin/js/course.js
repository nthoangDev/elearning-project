// Change Status
const changeForm = document.getElementById('form-change-status');
if (changeForm) {
  const BASE  = changeForm.dataset.path || '/admin/courses';
  const ORDER = ['DRAFT', 'PUBLISHED', 'UNLISTED', 'ARCHIVED'];

  document.querySelectorAll('.button-change-status').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (!id) return;

      // 1) Ưu tiên trạng thái được chỉ định sẵn trên nút
      let nextStatus = btn.dataset.status;

      // 2) Nếu không chỉ định, tự xoay vòng dựa trên trạng thái hiện tại
      if (!nextStatus) {
        const cur = btn.dataset.current || 'DRAFT';
        const idx = ORDER.indexOf(cur);
        nextStatus = ORDER[(idx + 1) % ORDER.length];
      }

      // Submit
      changeForm.action = `${BASE}/${id}/status?_method=PATCH`;
      let input = changeForm.querySelector('input[name="status"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'status';
        changeForm.appendChild(input);
      }
      input.value = nextStatus;
      changeForm.submit();
    });
  });
}

// Delete product
const deleteForm = document.getElementById('form-delete-item');
if (deleteForm) {
    const BASE = deleteForm.dataset.path || '/admin/courses';
    document.querySelectorAll('.button-delete').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (!id) return;

            const msg = btn.dataset.confirm || 'Xoá mục này? Thao tác không thể hoàn tác.';
            if (!window.confirm(msg)) return;

            deleteForm.action = `${BASE}/${id}?_method=DELETE`;
            deleteForm.submit();
        });
    });
}

