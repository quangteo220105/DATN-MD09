// my-app/config/apiConfig.js

// 🖥️ Chỉ cần đổi dòng IP này khi dùng mạng khác
const LOCAL_IP = "192.168.43.229"; // IP máy tính của Quang
const PORT = 3000;

// Tạo URL API gốc
export const BASE_URL = `http://${LOCAL_IP}:${PORT}/api`;
export const DOMAIN = `http://${LOCAL_IP}:${PORT}`;
