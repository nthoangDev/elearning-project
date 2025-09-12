const Cart = require('../../models/cart.model');
const Course = require('../../models/course.model');

// [GET] /api/student/cart
exports.getCart = async (req, res, next) => {
  try {
    const doc = await Cart.findOne({ user: req.user._id })
      .populate('items.course', 'title price salePrice currency imageUrl');
    res.json(doc || { user: req.user._id, items: [] });
  } catch (e) { next(e); }
};

// [POST] /api/student/cart/add
exports.addToCart = async (req, res, next) => {
  try {
    const { courseId, quantity = 1 } = req.body || {};
    const qty = Math.max(1, Number(quantity) || 1);

    const course = await Course.findById(courseId).lean();
    if (!course || course.deleted || course.visibility !== 'PUBLIC' || course.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Khoá học không khả dụng' });
    }

    // if exists => $inc quantity, else push
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const idx = cart.items.findIndex(it => String(it.course) === String(courseId));
    if (idx >= 0) {
      cart.items[idx].quantity = Math.max(1, (cart.items[idx].quantity || 1) + qty);
    } else {
      cart.items.push({ course: courseId, quantity: qty });
    }
    await cart.save();

    const populated = await cart.populate('items.course', 'title price salePrice currency imageUrl');
    res.status(201).json(populated);
  } catch (e) { next(e); }
};

// [DELETE] /api/student/cart/course/:courseId
exports.removeByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { items: { course: courseId } } },
      { new: true }
    ).populate('items.course', 'title price salePrice currency imageUrl');
    res.json(cart || { user: req.user._id, items: [] });
  } catch (e) { next(e); }
};

// [PUT] /api/student/cart/quantity
exports.setQuantity = async (req, res, next) => {
  try {
    const { courseId, quantity } = req.body || {};
    const qty = Math.max(1, Number(quantity) || 1);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const idx = cart.items.findIndex(it => String(it.course) === String(courseId));
    if (idx < 0) return res.status(404).json({ message: 'Item not found' });

    cart.items[idx].quantity = qty;
    await cart.save();

    const populated = await cart.populate('items.course', 'title price salePrice currency imageUrl');
    res.json(populated);
  } catch (e) { next(e); }
};
