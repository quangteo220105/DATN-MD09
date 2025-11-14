# 🖼️ Hướng dẫn Test Ảnh Sản Phẩm

## ✅ **Đã thực hiện:**

### **1. Tạo ảnh Nike Air Max:**
- ✅ **Copy ảnh:** `nike2.webp` → `nike-air-max.webp`
- ✅ **Location:** `backend/public/images/nike-air-max.webp`
- ✅ **Test data API:** Sử dụng ảnh thật thay vì placeholder

### **2. Cập nhật Test Data API:**
- ✅ **Multiple images:** 5 ảnh khác nhau cho 5 màu sắc
- ✅ **Image mapping:** Mỗi màu sắc có ảnh riêng
- ✅ **Real images:** Sử dụng ảnh có sẵn trong thư mục

## 🚀 **Cách test ảnh:**

### **1. Kiểm tra ảnh có tồn tại:**
```bash
# Kiểm tra file ảnh
dir backend\public\images\nike-air-max.webp
```

### **2. Test API với ảnh mới:**
```bash
# Chạy test script
node backend/test-api.js
```

### **3. Kiểm tra ảnh trong browser:**
```
http://localhost:3000/images/nike-air-max.webp
http://localhost:3000/images/nike2.webp
```

## 📊 **Expected Results:**

### **API Response với ảnh:**
```json
{
  "variants": [
    {
      "color": "Đen",
      "size": "40",
      "image": "/images/nike-air-max.webp",
      "currentPrice": 2590000,
      "stock": 10
    },
    {
      "color": "Trắng", 
      "size": "40",
      "image": "/images/nike2.webp",
      "currentPrice": 2590000,
      "stock": 5
    }
    // ... 28 variants khác
  ]
}
```

### **Frontend hiển thị:**
- ✅ **Image slider:** Hiển thị ảnh sản phẩm
- ✅ **Multiple images:** 5 ảnh khác nhau cho 5 màu sắc
- ✅ **Image loading:** Ảnh load đúng từ backend
- ✅ **Image quality:** Ảnh hiển thị rõ nét

## 🔍 **Debug Ảnh:**

### **1. Kiểm tra ảnh có load được không:**
- Mở browser: `http://localhost:3000/images/nike-air-max.webp`
- Nếu ảnh hiển thị = ✅ Backend serve ảnh đúng
- Nếu ảnh không hiển thị = ❌ Cần kiểm tra backend

### **2. Kiểm tra API response:**
- Console logs có hiển thị `image` field không?
- Image path có đúng format `/images/...` không?
- Có lỗi 404 khi load ảnh không?

### **3. Kiểm tra Frontend:**
- Image component có render không?
- Có lỗi "Image load failed" không?
- Ảnh có hiển thị đúng trong slider không?

## 📋 **Checklist:**

- [ ] **Ảnh Nike Air Max** đã được tạo
- [ ] **Test data API** đã được cập nhật
- [ ] **Backend server** đang chạy
- [ ] **Ảnh có thể truy cập** qua browser
- [ ] **API response** có đúng image field
- [ ] **Frontend app** đang chạy
- [ ] **Image slider** hiển thị ảnh
- [ ] **Multiple images** cho different colors
- [ ] **Image quality** rõ nét
- [ ] **No image errors** trong console

## 💡 **Tips:**

- **Luôn kiểm tra** ảnh có tồn tại trong thư mục
- **Test ảnh** trực tiếp qua browser trước
- **Kiểm tra console** để debug image loading
- **Sử dụng ảnh thật** thay vì placeholder
- **Optimize ảnh** để load nhanh hơn



























































