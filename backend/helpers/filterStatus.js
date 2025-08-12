const STATUSES = [
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'PUBLISHED', label: 'Đã xuất bản' },
    { value: 'UNLISTED', label: 'Không liệt kê' },
    { value: 'ARCHIVED', label: 'Đã lưu trữ' }
];


module.exports = (query) => {
    const current = String(query.status || 'all').toUpperCase();

    const filters = [{
        label: 'Tất cả',
        value: 'all',
        class: current === 'ALL' ? 'active' : '',
    }];

    for (const s of STATUSES) {
        filters.push({
            label: s.label,
            value: s.value,
            class: current === s.value ? 'active' : ''
        });
    }

    return filters;
}