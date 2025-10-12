const mongoose = require("mongoose");
// URL kết nối MongoDB Atlas (điền username, password, và tên database của bạn)
//const mongoURI = 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/mydatabase?retryWrites=true&w=majority';
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
            .then(() => {
                console.log("kết nối mongodb thành công");
            })
            .catch((err) => {
                console.log("kết nối thất bại");
            });
    } catch (error) {
        console.log("kết nối thất bại" + error);
    }
};
module.exports = { connect };
