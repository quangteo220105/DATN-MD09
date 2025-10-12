const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
    {
        image: { type: String, required: true }, // URL hoặc tên file ảnh
    },
    { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
