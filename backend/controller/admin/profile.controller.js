module.exports.mePage = async (req, res) => {
    const admin = res.locals.admin;

    res.render('admin/pages/profile/index', {
        pageTitle: 'Hồ sơ Admin',
        activeMenu: 'profile',
        admin
    });
};
