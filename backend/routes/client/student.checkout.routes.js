const r = require('express').Router();
const { createStripeSession, createMoMoPayment, createVnpayPayment, listOrders } = require('../../controller/client/student.checkout.controller');

r.post('/checkout/momo/create', createMoMoPayment);
r.post('/checkout/vnpay/create', createVnpayPayment);

r.get('/orders', listOrders);

module.exports = r;
