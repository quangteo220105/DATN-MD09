const mongoose = require("mongoose");
const fixReviewIndexes = require("../migrations/fixReviewIndexes");

// URL kết nối MongoDB
const mongoURI = "mongodb://127.0.0.1:27017/DB";

//kết nối
const connect = async () => {
    try {
        await mongoose
            .connect(mongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            })
            .then(async () => {
                console.log("kết nối mongodb thành công");

                // Chạy migration để fix review indexes
                await fixReviewIndexes();
            })
            .catch((err) => {
                console.log("kết nối thất bại");
            });
    } catch (error) {
        console.log("kết nối thất bại" + error);
    }
};
module.exports = { connect };
