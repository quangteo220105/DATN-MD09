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

// PATCH /api/users/:id/toggle-lock - Khóa/Mở khóa tài khoản
router.patch('/:id/toggle-lock', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    
    // Đảo ngược trạng thái khóa
    user.isLocked = !user.isLocked;
    await user.save();
    
    const message = user.isLocked ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản thành công!';
    res.json({ message, user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error('PATCH /api/users/:id/toggle-lock error:', err);
    res.status(500).json({ message: 'Lỗi server!' });
  }
});

// DELETE /api/users/:id - xoá người dùng (giữ lại để tương thích)
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
