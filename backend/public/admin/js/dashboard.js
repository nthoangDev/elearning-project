// /public/admin/js/dashboard.js
(function () {
  // Chạy đúng 1 lần cho mỗi lần tải trang
  if (window.__DASH_INIT__) return;
  window.__DASH_INIT__ = true;

  function fmtVND(v) {
    var n = Number(v) || 0;
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    } catch (_) {
      return (Math.round(n) + '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ₫';
    }
  }
  function toNums(arr) {
    return (Array.isArray(arr) ? arr : []).map(function (x) { return Number(x) || 0; });
  }
  // Hủy chart cũ nếu đã có (tránh tạo chồng)
  function getCtx(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var prev = window.Chart && window.Chart.getChart ? window.Chart.getChart(el) : null;
    if (prev && prev.destroy) prev.destroy();
    return el;
  }

  var commonOpts = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 200,        // giảm nhạy resize để tránh lắc
    animation: false,        // tắt animation để bớt reflow
    plugins: { legend: { display: false } }
  };

  var S = window.__DASH__ || {};
  var revenueDaily = S.revenueDaily || { labels: [], data: [] };
  var enrollDaily  = S.enrollDaily  || { labels: [], data: [] };
  var byTopic      = Array.isArray(S.byTopic) ? S.byTopic : [];
  var topCourses   = Array.isArray(S.topCourses) ? S.topCourses : [];

  function makeLine(id, labels, data, label, isMoney) {
    var el = getCtx(id);
    if (!el) return;
    new Chart(el, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: toNums(data),
          tension: 0.25,
          fill: true
        }]
      },
      options: Object.assign({}, commonOpts, {
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            ticks: {
              callback: function (val) {
                return isMoney ? fmtVND(val) : new Intl.NumberFormat('vi-VN').format(val);
              }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var y = ctx.parsed.y;
                return (label || '') + ': ' + (isMoney ? fmtVND(y) : new Intl.NumberFormat('vi-VN').format(y));
              }
            }
          }
        }
      })
    });
  }

  function makeDoughnut(id, labels, data) {
    var el = getCtx(id);
    if (!el) return;
    new Chart(el, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: toNums(data) }]
      },
      options: Object.assign({}, commonOpts, {
        plugins: { legend: { position: 'bottom' } }
      })
    });
  }

  function makeBar(id, labels, data, isMoney) {
    var el = getCtx(id);
    if (!el) return;
    new Chart(el, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: isMoney ? 'Doanh thu (VND)' : 'Số lượng', data: toNums(data) }]
      },
      options: Object.assign({}, commonOpts, {
        scales: {
          y: {
            ticks: {
              callback: function (val) {
                return isMoney ? fmtVND(val) : new Intl.NumberFormat('vi-VN').format(val);
              }
            }
          }
        }
      })
    });
  }

  // Vẽ chart
  makeLine('revenueChart', revenueDaily.labels || [], revenueDaily.data || [], 'Doanh thu', true);
  makeLine('enrollChart',  enrollDaily.labels  || [], enrollDaily.data  || [], 'Ghi danh mới', false);

  var topicLabels = byTopic.map(function (x) { return x && x.name ? x.name : 'N/A'; });
  var topicData   = byTopic.map(function (x) { return x && x.count ? Number(x.count) : 0; });
  makeDoughnut('topicChart', topicLabels, topicData);

  var topLabels = topCourses.map(function (x) { return x && x.title ? x.title : 'N/A'; });
  var topData   = topCourses.map(function (x) { return x && x.revenue ? Number(x.revenue) : 0; });
  makeBar('topCourseChart', topLabels, topData, true);

  // Nút nhanh 7/30 ngày
  var form = document.getElementById('dateRangeForm');
  function setRange(days) {
    if (!form) return;
    var to = new Date();
    var from = new Date();
    from.setDate(to.getDate() - (days - 1));
    function pad(n){ return String(n).padStart(2, '0'); }
    function iso(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
    var fromInp = form.querySelector('input[name="from"]');
    var toInp   = form.querySelector('input[name="to"]');
    if (fromInp) fromInp.value = iso(from);
    if (toInp)   toInp.value   = iso(to);
    form.submit();
  }
  var b7  = document.getElementById('btnLast7');
  var b30 = document.getElementById('btnLast30');
  if (b7)  b7.addEventListener('click',  function(){ setRange(7);  });
  if (b30) b30.addEventListener('click', function(){ setRange(30); });

})();
