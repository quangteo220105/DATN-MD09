const express = require('express');
const router = express.Router();
const Message = require('../model/Message');

// Gửi tin nhắn
router.post('/send', async (req, res) => {
    try {
        const { senderId, senderName, senderType, receiverId, receiverName, message } = req.body;

        if (!senderId || !senderName || !senderType || !receiverId || !receiverName || !message) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc!' });
        }

        const newMessage = new Message({
            senderId,
            senderName,
            senderType,
            receiverId,
            receiverName,
            message,
            read: false
        });

        await newMessage.save();
        res.status(201).json({ message: 'Gửi tin nhắn thành công!', data: newMessage });
    } catch (error) {
        console.error('POST /api/messages/send error:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

// Lấy tin nhắn giữa 2 người
router.get('/conversation', async (req, res) => {
    try {
        const { senderId, receiverId } = req.query;

        if (!senderId || !receiverId) {
            return res.status(400).json({ message: 'Thiếu senderId hoặc receiverId!' });
        }

        const messages = await Message.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error('GET /api/messages/conversation error:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

// Lấy danh sách người đã chat với admin (admin dùng)
router.get('/admin/conversations', async (req, res) => {
    try {
        const { adminId } = req.query;

        if (!adminId) {
            return res.status(400).json({ message: 'Thiếu adminId!' });
        }

        // Lấy danh sách user đã chat với admin này
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: adminId, senderType: 'admin' },
                        { receiverId: adminId }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$senderId', adminId] },
                            '$receiverId',
                            '$senderId'
                        ]
                    },
                    name: {
                        $first: {
                            $cond: [
                                { $eq: ['$senderId', adminId] },
                                '$receiverName',
                                '$senderName'
                            ]
                        }
                    },
                    lastMessage: { $last: '$message' },
                    lastMessageTime: { $last: '$createdAt' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$read', false] }, { $ne: ['$senderId', adminId] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { lastMessageTime: -1 } }
        ]);

        res.json(conversations);
    } catch (error) {
        console.error('GET /api/messages/admin/conversations error:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

// Lấy tin nhắn chưa đọc của user
router.get('/unread/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const unreadCount = await Message.countDocuments({ receiverId: userId, read: false });
        res.json({ count: unreadCount });
    } catch (error) {
        console.error('GET /api/messages/unread/:userId error:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

// Đánh dấu tin nhắn đã đọc
router.put('/read/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { senderId } = req.body;

        await Message.updateMany(
            { senderId, receiverId: userId, read: false },
            { $set: { read: true } }
        );

        res.json({ message: 'Đã đánh dấu đọc!' });
    } catch (error) {
        console.error('PUT /api/messages/read/:userId error:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

module.exports = router;

