const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderType: { type: String, enum: ['user', 'admin'], required: true },
    receiverId: { type: String, required: true },
    receiverName: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);

