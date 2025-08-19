document.addEventListener('DOMContentLoaded', () => {
  // Search kw
  const searchForm = document.querySelector('#form-search');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = new URL(window.location.href);
      const keyword = e.target.elements.keyword.value.trim();
      if (keyword) url.searchParams.set('keyword', keyword);
      else url.searchParams.delete('keyword');
      url.searchParams.delete('page');
      window.location.href = url.href;
    });
  }

  // Pagination
  const btnPagination = document.querySelectorAll('[button-pagi]');
  if (btnPagination && btnPagination.length) {
    btnPagination.forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        const page = btn.getAttribute('button-pagi');
        if (page) url.searchParams.set('page', page);
        else url.searchParams.delete('page');
        window.location.href = url.href;
      });
    });
  }

  // Check all
  const chkboxMulti = document.querySelector("[checkbox-multi]");
  const chkAll = chkboxMulti.querySelector('#checkAll');
  const inputsId = chkboxMulti.querySelectorAll("input[name='ids']");
  if (chkAll) {
    chkAll.addEventListener('change', (e) => {
      if (chkAll.checked) {
        inputsId.forEach(inp => {
          inp.checked = true;
        });
      } else {
        inputsId.forEach(inp => {
          inp.checked = false;
        })
      }
    });

    inputsId.forEach(inp => {
      inp.addEventListener("click", () => {
        const countChecked = chkboxMulti.querySelectorAll("input[name='ids']:checked").length;

        if (countChecked == inputsId.length) {
          chkAll.checked = true;
        } else {
          chkAll.checked = false;
        }
      });
    });
  }
});
