# 🖼️ Hướng dẫn Debug Ảnh Sản Phẩm

## ✅ **Đã kiểm tra:**

### **1. Backend ảnh hoạt động:**
- ✅ **Ảnh Nike Air Max:** `http://192.168.1.9:3000/images/nike-air-max.webp` (Status: 200)
- ✅ **Ảnh Nike 2:** `http://192.168.1.9:3000/images/nike2.webp` (Status: 200)
- ✅ **Ảnh khác:** `http://192.168.1.9:3000/images/1760555812506.webp` (Status: 200)

### **2. Frontend đã sửa:**
- ✅ **getCurrentImages():** Hiển thị tất cả ảnh unique khi chưa chọn variant
- ✅ **Image URI:** Sử dụng `http://192.168.1.9:3000${item}` thay vì BASE_URL
- ✅ **Debug logs:** Thêm onError và onLoad để debug
- ✅ **Console logs:** Log image URI và load status

## 🚀 **Cách test:**

### **1. Restart Frontend App:**
```bash
# Sử dụng Command Prompt (không phải PowerShell)
cd C:\DATN\DATN-MD09\my-app
npx expo start --clear
```

### **2. Test trên App:**
1. **Mở app** trên emulator/device
2. **Navigate** đến Home screen
3. **Tap vào Nike Air Max** để xem chi tiết
4. **Mở Developer Tools** (F12)
5. **Xem Console logs**

### **3. Kiểm tra Console Logs:**
```
Product Detail Screen - ID: 68f3de675c0c4faca20f6777
Fetching product from: http://192.168.1.9:3000/api/products/68f3de675c0c4faca20f6777
Product response: [full-response]
Product variants count: 30
=== DEBUG VARIANTS ===
Total variants: 30
Available images: [
  "http://192.168.1.9:3000/images/nike-air-max.webp",
  "http://192.168.1.9:3000/images/nike2.webp",
  "http://192.168.1.9:3000/images/1760555812506.webp",
  "http://192.168.1.9:3000/images/1760557872491.webp",
  "http://192.168.1.9:3000/images/1760607215185.webp"
]
Image URI: http://192.168.1.9:3000/images/nike-air-max.webp
Image loaded successfully: http://192.168.1.9:3000/images/nike-air-max.webp
```

## 🔍 **Debug Steps:**

### **1. Nếu ảnh vẫn không hiển thị:**

#### **A. Kiểm tra Console Logs:**
- Có log "Available images" không?
- Có log "Image URI" không?
- Có log "Image loaded successfully" không?
- Có log "Image load error" không?

#### **B. Kiểm tra Network:**
- Mở Developer Tools → Network tab
- Reload trang
- Xem có request đến ảnh không?
- Status code là gì? (200, 404, 500?)

#### **C. Kiểm tra Image Component:**
- Image component có render không?
- Style có đúng không?
- Có lỗi gì trong console không?

### **2. Nếu có lỗi "Image load error":**

#### **A. Kiểm tra URL:**
- URL có đúng format không?
- IP address có đúng không?
- Port có đúng không?

#### **B. Kiểm tra Backend:**
- Backend server có chạy không?
- Ảnh có tồn tại trong thư mục không?
- CORS có được cấu hình đúng không?

### **3. Nếu ảnh hiển thị nhưng không đúng:**

#### **A. Kiểm tra Image Source:**
- Ảnh có đúng không?
- Có hiển thị ảnh placeholder không?
- Có hiển thị ảnh khác không?

#### **B. Kiểm tra Variants:**
- Variants có đúng image field không?
- Image path có đúng format không?
- Có duplicate images không?

## 📋 **Checklist:**

- [ ] **Backend server** đang chạy
- [ ] **Ảnh có thể truy cập** qua browser
- [ ] **Frontend app** đã restart
- [ ] **Console logs** hiển thị đầy đủ
- [ ] **Available images** có 5 ảnh
- [ ] **Image URI** đúng format
- [ ] **Image loaded successfully** log
- [ ] **No image load error** log
- [ ] **Image slider** hiển thị ảnh
- [ ] **Image quality** rõ nét

## 💡 **Tips:**

- **Luôn kiểm tra console** để debug
- **Sử dụng Command Prompt** thay vì PowerShell
- **Kiểm tra network tab** để xem requests
- **Test ảnh trực tiếp** qua browser trước
- **Restart app** sau khi sửa code









































































