const r = require('express').Router();
const { getCart, addToCart, removeByCourse, setQuantity } = require('../../controller/client/student.cart.controller');

r.get('/cart', getCart);
r.post('/cart/add', addToCart);
r.delete('/cart/course/:courseId', removeByCourse);
r.put('/cart/quantity', setQuantity);

module.exports = r;
