module.exports.index = async (req, res)=>{
    res.render('admin/pages/dashboard/index', {
        pageTitle: "Tổng quan"
    })
}