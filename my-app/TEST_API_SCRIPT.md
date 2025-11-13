# 🧪 Test API Script

## 📋 **Các bước test:**

### **1. Restart Backend Server:**
```bash
cd backend
npm start
```

### **2. Test tạo test data:**
```bash
# Thay [PRODUCT_ID] bằng ID thật của Nike Air Max
curl -X POST http://localhost:3000/api/products/test-data/[PRODUCT_ID]
```

### **3. Test lấy product details:**
```bash
# Thay [PRODUCT_ID] bằng ID thật của Nike Air Max
curl http://localhost:3000/api/products/[PRODUCT_ID]
```

### **4. Restart Frontend App:**
```bash
cd my-app
npx expo start --clear
```

## 🎯 **Expected Results:**

### **Backend Console:**
```
🔍 Product ID: [product-id]
🔍 Product Name: Nike Air Max
🔍 Total Variants: 30
🔍 Variants: [30 variants array]
✅ Đã tạo 30 variants cho sản phẩm Nike Air Max
```

### **API Response:**
```json
{
  "_id": "product-id",
  "name": "Nike Air Max",
  "variants": [
    {
      "color": "Đen",
      "size": "40",
      "currentPrice": 2590000,
      "stock": 5
    },
    // ... 29 variants khác
  ]
}
```

### **Frontend Console:**
```
Available colors from API: ["Đen", "Trắng", "Xanh", "Đỏ", "Xám"]
Available sizes from API: ["40", "41", "42", "43", "44", "45"]
```

## 🔍 **Debug Checklist:**

- [ ] Backend server chạy
- [ ] Test data API thành công
- [ ] Product details API trả về 30 variants
- [ ] Frontend app restart
- [ ] Console logs hiển thị đầy đủ
- [ ] UI hiển thị 5 màu sắc
- [ ] UI hiển thị 6 kích cỡ
- [ ] Selection hoạt động đúng
- [ ] Price updates theo variant
- [ ] Stock updates theo variant


























































