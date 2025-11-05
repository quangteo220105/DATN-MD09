const express = require('express');
const mongoose = require('mongoose');
const Order = require('../model/Order');

const router = express.Router();

// Only consider delivered orders for revenue stats
const DELIVERED_STATUS = 'Đã giao hàng';

function parseDate(value, fallback) {
  const d = value ? new Date(value) : null;
  return isNaN(d?.getTime?.()) ? fallback : d;
}

function buildDateMatch(from, to) {
  const match = { status: DELIVERED_STATUS };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = from;
    if (to) match.createdAt.$lte = to;
  }
  return match;
}

// GET /api/analytics/summary?from=&to=
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = parseDate(from, null);
    const toDate = parseDate(to, null);

    const match = buildDateMatch(fromDate, toDate);

    const [agg] = await Order.aggregate([
      { $match: match },
      {
        $project: {
          total: { $ifNull: ['$total', 0] },
          items: 1,
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          ordersCount: { $sum: 1 },
          productsSold: {
            $sum: {
              $sum: {
                $map: {
                  input: { $ifNull: ['$items', []] },
                  as: 'it',
                  in: { $ifNull: ['$$it.qty', 1] }
                }
              }
            }
          }
        }
      }
    ]);

    res.json({
      revenue: agg?.revenue || 0,
      ordersCount: agg?.ordersCount || 0,
      productsSold: agg?.productsSold || 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/revenue?from=&to=&groupBy=day|month|year
router.get('/revenue', async (req, res) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    const fromDate = parseDate(from, null);
    const toDate = parseDate(to, null);
    const match = buildDateMatch(fromDate, toDate);

    let dateSpec;
    if (groupBy === 'year') {
      dateSpec = { year: { $year: '$createdAt' } };
    } else if (groupBy === 'month') {
      dateSpec = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else {
      dateSpec = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    }

    const data = await Order.aggregate([
      { $match: match },
      { $group: { _id: dateSpec, revenue: { $sum: { $ifNull: ['$total', 0] } }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json(data.map(d => ({
      period: d._id,
      revenue: d.revenue,
      orders: d.orders,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/top-products?from=&to=&limit=10
router.get('/top-products', async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;
    const fromDate = parseDate(from, null);
    const toDate = parseDate(to, null);
    const match = buildDateMatch(fromDate, toDate);

    const data = await Order.aggregate([
      { $match: match },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { name: '$items.name', color: '$items.color', size: '$items.size', productId: '$items.productId' },
          qty: { $sum: { $ifNull: ['$items.qty', 1] } },
          revenue: { $sum: { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.qty', 1] }] } },
        }
      },
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: Number(limit) }
    ]);

    res.json(data.map(d => ({
      productId: d._id.productId,
      name: d._id.name,
      color: d._id.color,
      size: d._id.size,
      qty: d.qty,
      revenue: d.revenue,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/top-customers?from=&to=&limit=10
router.get('/top-customers', async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;
    const fromDate = parseDate(from, null);
    const toDate = parseDate(to, null);
    const match = buildDateMatch(fromDate, toDate);

    const data = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          revenue: { $sum: { $ifNull: ['$total', 0] } },
          orders: { $sum: 1 },
          lastOrderAt: { $max: '$createdAt' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: Number(limit) }
    ]);

    // Try to attach basic user info if available
    let usersById = {};
    try {
      const User = mongoose.model('User');
      const ids = data.map(d => d._id).filter(Boolean);
      if (ids.length) {
        const users = await User.find({ _id: { $in: ids } }, { name: 1, email: 1, phone: 1 });
        usersById = users.reduce((acc, u) => { acc[String(u._id)] = u; return acc; }, {});
      }
    } catch {}

    res.json(data.map(d => ({
      userId: d._id,
      name: usersById[String(d._id)]?.name || 'Khách hàng',
      email: usersById[String(d._id)]?.email || null,
      phone: usersById[String(d._id)]?.phone || null,
      revenue: d.revenue,
      orders: d.orders,
      lastOrderAt: d.lastOrderAt,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/growth?currentFrom=&currentTo=&prevFrom=&prevTo=
router.get('/growth', async (req, res) => {
  try {
    const { currentFrom, currentTo, prevFrom, prevTo } = req.query;
    const cFrom = parseDate(currentFrom, null);
    const cTo = parseDate(currentTo, null);
    const pFrom = parseDate(prevFrom, null);
    const pTo = parseDate(prevTo, null);

    async function calcRange(from, to) {
      const match = buildDateMatch(from, to);
      const [agg] = await Order.aggregate([
        { $match: match },
        { $group: { _id: null, revenue: { $sum: { $ifNull: ['$total', 0] } }, orders: { $sum: 1 } } }
      ]);
      return { revenue: agg?.revenue || 0, orders: agg?.orders || 0 };
    }

    const [curr, prev] = await Promise.all([
      calcRange(cFrom, cTo),
      calcRange(pFrom, pTo)
    ]);

    function pct(currVal, prevVal) {
      if (!prevVal) return currVal ? 100 : 0;
      return Number((((currVal - prevVal) / prevVal) * 100).toFixed(2));
    }

    res.json({
      current: curr,
      previous: prev,
      revenueChangePct: pct(curr.revenue, prev.revenue),
      ordersChangePct: pct(curr.orders, prev.orders),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


