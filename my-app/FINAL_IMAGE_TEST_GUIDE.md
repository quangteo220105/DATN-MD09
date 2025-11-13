# 🖼️ Hướng dẫn Test Ảnh Sản Phẩm

## ✅ **Đã thực hiện:**

### **1. Sửa Home Screen:**
- ✅ **Image URI:** Sử dụng `http://192.168.1.9:3000${mainVariant.image}` thay vì BASE_URL
- ✅ **Debug logs:** Thêm onError và onLoad để debug
- ✅ **Console logs:** Log image URI và load status

### **2. Sửa Test Data API:**
- ✅ **Brand-based images:** Chọn ảnh dựa trên brand (Nike/Adidas)
- ✅ **Nike images:** nike-air-max.webp, nike2.webp, etc.
- ✅ **Adidas images:** adidas1.webp, adidas2.webp, etc.

### **3. Ảnh có sẵn:**
- ✅ **Nike Air Max:** `/images/nike-air-max.webp` (17KB)
- ✅ **Adidas 1:** `/images/adidas1.webp` (23KB)
- ✅ **Adidas 2:** `/images/adidas2.webp` (36KB)

## 🚀 **Cách test:**

### **1. Restart Backend Server:**
```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy lại:
cd backend
npm start
```

### **2. Test API với ảnh mới:**
```bash
# Test Nike Air Max
node backend/test-api.js

# Test Adidas
node backend/update-adidas-images.js
```

### **3. Restart Frontend App:**
```bash
# Sử dụng Command Prompt (không phải PowerShell)
cd C:\DATN\DATN-MD09\my-app
npx expo start --clear
```

## 📊 **Expected Results:**

### **Backend Console:**
```
✅ Đã tạo 30 variants cho sản phẩm Nike Air Max
✅ Đã tạo 30 variants cho sản phẩm Adidas Ultraboost 2025
```

### **API Response:**
```json
{
  "variants": [
    {
      "color": "Đen",
      "size": "40",
      "image": "/images/nike-air-max.webp",  // Nike
      "currentPrice": 2590000
    },
    {
      "color": "Đen", 
      "size": "40",
      "image": "/images/adidas1.webp",      // Adidas
      "currentPrice": 2590000
    }
  ]
}
```

### **Frontend Console:**
```
Home image loaded successfully: http://192.168.1.9:3000/images/nike-air-max.webp
Home image loaded successfully: http://192.168.1.9:3000/images/adidas1.webp
```

## 🔍 **Debug Steps:**

### **1. Nếu ảnh vẫn không hiển thị:**

#### **A. Kiểm tra Backend:**
- Backend server có chạy không?
- API có trả về đúng ảnh không?
- Ảnh có tồn tại trong thư mục không?

#### **B. Kiểm tra Frontend:**
- App có restart không?
- Console có log "Home image loaded successfully" không?
- Có lỗi "Home image load error" không?

#### **C. Kiểm tra Network:**
- Mở Developer Tools → Network tab
- Xem có request đến ảnh không?
- Status code là gì? (200, 404, 500?)

### **2. Nếu ảnh hiển thị nhưng không đúng:**

#### **A. Kiểm tra API Response:**
- Variants có đúng image field không?
- Image path có đúng format không?
- Brand có được detect đúng không?

#### **B. Kiểm tra Test Data:**
- Test data có được tạo đúng không?
- Ảnh có được assign đúng brand không?
- Có cache cũ không?

## 📋 **Checklist:**

- [ ] **Backend server** đã restart
- [ ] **Test data API** đã được gọi
- [ ] **Nike Air Max** có ảnh nike-air-max.webp
- [ ] **Adidas** có ảnh adidas1.webp, adidas2.webp
- [ ] **Frontend app** đã restart
- [ ] **Console logs** hiển thị đầy đủ
- [ ] **Home screen** hiển thị ảnh sản phẩm
- [ ] **Product detail** hiển thị ảnh sản phẩm
- [ ] **No image errors** trong console
- [ ] **Image quality** rõ nét

## 💡 **Tips:**

- **Luôn restart** cả backend và frontend
- **Kiểm tra console** để debug
- **Sử dụng Command Prompt** thay vì PowerShell
- **Test ảnh trực tiếp** qua browser trước
- **Kiểm tra network tab** để xem requests

























































