module.exports = (query= {}, totalCount=0, defaultLimit = 12) => {
    let limit = parseInt(query.limit, 10);
    if (!Number.isFinite(limit) || limit < 1 || limit > 1000) limit = defaultLimit;

    let currentPage = parseInt(query.page, 10);
    if(!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;

    const totalPage = Math.max(1, Math.ceil(totalCount/limit));

    if (currentPage > totalPage) currentPage = totalPage;

    const skip = (currentPage - 1) * limit;
    
    return {
        currentPage,
        limitItem: limit,
        totalPage,
        totalCount,
        skip
    };
};