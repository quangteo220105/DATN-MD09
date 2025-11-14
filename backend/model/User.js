const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: null },
    resetCode: { type: String, default: null },
    isLocked: { type: Boolean, default: false } // Trạng thái khóa tài khoản
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
