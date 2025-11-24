// my-app/config/apiConfig.js

// 🖥️ Chỉ cần đổi dòng IP này khi dùng mạng khác
<<<<<<< HEAD
const LOCAL_IP = "192.168.1.9"; // IP máy tính của Quang
=======
const LOCAL_IP = "192.168.1.7"; // IP máy tính của Quang
>>>>>>> 389f604 (Sửa lại giao diện quản lý sản phẩm)
// const LOCAL_IP = "172.20.10.2"; // IP máy iphone 
// const LOCAL_IP = "192.168.43.229" //IP máy a D
const PORT = 3000;

// Tạo URL API gốc
export const BASE_URL = `http://${LOCAL_IP}:${PORT}/api`;
export const DOMAIN = `http://${LOCAL_IP}:${PORT}`;
