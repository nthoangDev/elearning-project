const crypto = require('crypto');
const axios = require('axios');

const Order = require('../../models/order.model');
const Payment = require('../../models/payment.model');
const Cart = require('../../models/cart.model');
const Course = require('../../models/course.model');
const Enrollment = require('../../models/enrollement.model');

// Build current order payload from cart
async function buildOrder(userId) {
  const cart = await Cart.findOne({ user: userId }).lean();
  if (!cart || !cart.items?.length) return null;

  const courseIds = cart.items.map(x => x.course);
  const courses = await Course.find(
    { _id: { $in: courseIds } },
    'title price salePrice'
  ).lean();

  const courseMap = Object.fromEntries(courses.map(c => [String(c._id), c]));

  const items = [];
  for (const it of cart.items) {
    const c = courseMap[String(it.course)];
    if (!c) continue;
    const unit = typeof c.salePrice === 'number' ? c.salePrice : c.price;
    items.push({
      course: it.course,
      courseTitle: c.title,
      unitPrice: Number(unit) || 0,
      quantity: Math.max(1, it.quantity || 1),
    });
  }
  if (!items.length) return null;

  const totalAmount = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  return { items, totalAmount, currency: 'VND' };
}

//  MoMo helpers
function momoCreateSignature({
  accessKey, amount, extraData, ipnUrl, orderId, orderInfo,
  partnerCode, redirectUrl, requestId, requestType, secretKey
}) {
  // EXACT key order required by MoMo
  const raw =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

function buildMomoIpnRaw(body, accessKeyFromEnv) {
  const ks = [
    'accessKey','amount','extraData','message',
    'orderId','orderInfo','orderType','partnerCode',
    'payType','requestId','responseTime','resultCode','transId'
  ];
  // ghép accessKey từ ENV + phần còn lại từ body
  const map = { ...body, accessKey: accessKeyFromEnv };
  return ks.map(k => `${k}=${map[k] ?? ''}`).join('&');
}

function verifyMomoIpnSignature(accessKey, secretKey, body) {
  if (!accessKey || !secretKey) return false;
  const raw = buildMomoIpnRaw(body, accessKey);
  const expected = crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
  return expected === body?.signature;
}

//  [POST] /api/student/checkout/momo/create
exports.createMoMoPayment = async (req, res, next) => {
  try {
    const pack = await buildOrder(req.user._id);
    if (!pack) return res.status(400).json({ message: 'Giỏ hàng trống' });
    const { items, totalAmount } = pack;

    const order = await Order.create({
      user: req.user._id,
      provider: 'MOMO',
      status: 'PENDING',
      totalAmount,
      currency: 'VND',
      items
    });

    await Payment.create({
      order: order._id,
      user: req.user._id,
      amount: totalAmount,
      currency: 'VND',
      method: 'MOMO',
      status: 'PENDING'
    });

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    if (!partnerCode || !accessKey || !secretKey) {
      return res.status(500).json({ message: 'Thiếu cấu hình MoMo (PARTNER_CODE / ACCESS_KEY / SECRET_KEY)' });
    }
    const endpoint = process.env.MOMO_CREATE_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';

    const requestId = `${partnerCode}${Date.now()}`;
    const orderId = String(order._id);
    const amountStr = String(Math.round(Number(totalAmount)));

    const redirectUrl = `${process.env.WEB_BASE_URL}/checkout/momo-return?order=${order._id}`;
    const ipnUrl = `${process.env.API_BASE_URL}/api/webhooks/momo`;
    const orderInfo = 'ELearnPro';
    const requestType = 'captureWallet';
    const extraData = '';

    const signature = momoCreateSignature({
      accessKey, amount: amountStr, extraData, ipnUrl,
      orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType, secretKey
    });

    const payload = {
      partnerCode, accessKey, requestId,
      amount: amountStr,
      orderId, orderInfo,
      redirectUrl, ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi'
    };
    const momoRes = await axios.post(endpoint, payload, { headers: { 'Content-Type': 'application/json' } });
    if (momoRes?.data?.payUrl) return res.json({ url: momoRes.data.payUrl });

    return res.status(502).json({ message: 'MoMo create failed', detail: momoRes?.data || null });
  } catch (e) { next(e); }
};

//   VNPay helpers — mimic Java URLEncoder behavior
//    - Sort fields
//    - URL-encode keys & values
//    - Replace spaces with '+' (like Java URLEncoder)
//    - HMAC-SHA512 on encoded pair string "k=v&k2=v2..."
function vnpEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/%20/g, '+'); // Java URLEncoder encodes space as '+'
}

function buildVnpEncodedPairs(params) {
  const keys = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '');
  keys.sort();
  const pairs = [];
  for (const k of keys) {
    const v = params[k];
    pairs.push(`${vnpEncode(k)}=${vnpEncode(v)}`);
  }
  return pairs.join('&');
}

// [POST] /api/student/checkout/vnpay/create
exports.createVnpayPayment = async (req, res, next) => {
  try {
    const pack = await buildOrder(req.user._id);
    if (!pack) return res.status(400).json({ message: 'Giỏ hàng trống' });
    const { totalAmount, items } = pack;

    const order = await Order.create({
      user: req.user._id,
      provider: 'VNPAY',
      status: 'PENDING',
      totalAmount,
      currency: 'VND',
      items
    });

    await Payment.create({
      order: order._id,
      user: req.user._id,
      amount: totalAmount,
      currency: 'VND',
      method: 'VNPAY',
      status: 'PENDING'
    });

    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = `${process.env.API_BASE_URL}/api/webhooks/vnpay-return`;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const createDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: Math.round(Number(totalAmount)) * 100, // ×100
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(order._id),
      vnp_OrderInfo: 'ELearnPro',
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
      vnp_CreateDate: createDate,
      // Optional:
      // vnp_BankCode: 'NCB',
      // vnp_ExpireDate: 'yyyyMMddHHmmss'
    };

    // (1) Build encoded string for HMAC (exactly like query string)
    const hashData = buildVnpEncodedPairs(vnp_Params);

    // (2) HMAC-SHA512 with secret
    const vnp_SecureHash = crypto.createHmac('sha512', secretKey)
      .update(Buffer.from(hashData, 'utf-8'))
      .digest('hex');

    // (3) Final redirect URL (encoded params + vnp_SecureHash)
    const query = `${hashData}&vnp_SecureHash=${vnp_SecureHash}`;
    const paymentUrl = `${vnpUrl}?${query}`;

    res.json({ url: paymentUrl });
  } catch (e) { next(e); }
};

//  Orders / Fulfillment
exports.listOrders = async (req, res, next) => {
  try {
    const items = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { next(e); }
};

exports.fulfillOrder = async ({ orderId, transactionId, rawPayload }) => {
  const order = await Order.findById(orderId);
  if (!order) return;
  if (order.status === 'PAID') return; // idempotent

  order.status = 'PAID';
  await order.save();

  const payment = await Payment.findOne({ order: order._id, user: order.user, status: 'PENDING' });
  if (payment) {
    payment.status = 'COMPLETED';
    if (transactionId) payment.transactionId = transactionId;
    payment.rawPayload = rawPayload || payment.rawPayload;
    await payment.save();
  }

  // create enrollments per course
  for (const it of order.items) {
    try {
      await Enrollment.updateOne(
        { user: order.user, course: it.course },
        {
          $setOnInsert: {
            user: order.user,
            course: it.course,
            order: order._id,
            payment: payment?._id,
            enrolledAt: new Date(),
            progressPct: 0
          }
        },
        { upsert: true }
      );
    } catch { /* ignore per item */ }
  }

  // clear cart
  await Cart.findOneAndUpdate({ user: order.user }, { $set: { items: [] } });
};

//  * IPNs / Return handlers
const _fulfillOrder = exports.fulfillOrder;

//  * VNPay return: verify signature EXACTLY like Java sample
//  *  - Remove vnp_SecureHash & vnp_SecureHashType
//  *  - Sort remaining fields
//  *  - URL-encode keys & values (space -> '+')
//  *  - HMAC-SHA512 over "k=v&..." using secret
exports.vnpayReturn = async (req, res) => {
  try {
    const fields = { ...(req.query || {}) };
    const receivedHash = String(fields.vnp_SecureHash || '');
    delete fields.vnp_SecureHash;
    delete fields.vnp_SecureHashType;

    const hashData = buildVnpEncodedPairs(fields);
    const signed = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET)
      .update(Buffer.from(hashData, 'utf-8'))
      .digest('hex');

    const isValid = signed.toLowerCase() === receivedHash.toLowerCase();
    const code = fields.vnp_ResponseCode || fields.vnp_TransactionStatus;
    const isSuccess = code === '00';

    if (isValid && isSuccess && fields.vnp_TxnRef) {
      await _fulfillOrder({
        orderId: fields.vnp_TxnRef,
        transactionId: fields.vnp_TransactionNo,
        rawPayload: req.query
      });
      return res.redirect(`${process.env.WEB_BASE_URL}/checkout/success?order=${fields.vnp_TxnRef}`);
    }

    return res.redirect(`${process.env.WEB_BASE_URL}/checkout/cancel?order=${fields.vnp_TxnRef || ''}`);
  } catch {
    return res.redirect(`${process.env.WEB_BASE_URL}/checkout/cancel`);
  }
};

//  * MoMo IPN (server-to-server)
exports.momoIpn = async (req, res) => {
  try {
    const okSign = verifyMomoIpnSignature(
      process.env.MOMO_ACCESS_KEY,
      process.env.MOMO_SECRET_KEY,
      req.body || {}
    );
    if (!okSign) return res.status(400).json({ ok:false, message:'Invalid MoMo signature' });

    const { orderId, resultCode, transId } = req.body || {};
    if (orderId && String(resultCode) === '0') {
      await _fulfillOrder({ orderId, transactionId: transId, rawPayload: req.body });
    }
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false }); }
};