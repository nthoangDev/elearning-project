

module.exports = (query, status) => {
    const current = String(query.status || 'all').toUpperCase();

    const filters = [{
        label: 'Tất cả',
        value: 'all',
        class: current === 'ALL' ? 'active' : '',
    }];

    for (const s of status) {
        filters.push({
            label: s.label,
            value: s.value,
            class: current === s.value ? 'active' : ''
        });
    }

    return filters;
}