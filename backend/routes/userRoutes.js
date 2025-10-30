const express = require('express');
const router = express.Router();
const User = require('../model/User');

// GET /api/users - danh sách người dùng
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetCode').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ message: 'Lỗi server!' });
  }
});

// GET /api/users/:id - lấy thông tin người dùng theo id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id, '-password -resetCode');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    res.json(user);
  } catch (err) {
    console.error('GET /api/users/:id error:', err);
    res.status(500).json({ message: 'Lỗi server!' });
  }
});

// DELETE /api/users/:id - xoá người dùng
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    res.json({ message: 'Đã xoá người dùng.' });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    res.status(500).json({ message: 'Lỗi server!' });
  }
});

module.exports = router;
