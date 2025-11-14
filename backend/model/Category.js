const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String },
        isActive: { type: Boolean, default: true }, // Mặc định là hiển thị
    },
    { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
