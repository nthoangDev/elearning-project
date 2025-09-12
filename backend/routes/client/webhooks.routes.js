const r = require('express').Router();
const express = require("express");
const bodyParser = require('body-parser');
const { momoIpn, vnpayReturn } = require('../../controller/client/student.checkout.controller');

// Stripe require raw body
r.post('/webhooks/momo', express.json({ type: '*/*' }), momoIpn);
r.get('/webhooks/vnpay-return', vnpayReturn);

module.exports = r;
