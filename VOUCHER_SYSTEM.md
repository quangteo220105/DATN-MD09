# 🎫 Hệ thống Quản lý Voucher

## 📋 Tổng quan

Hệ thống quản lý voucher chuyên nghiệp đã được triển khai đầy đủ trong ứng dụng DATN-MD09, bao gồm:
- **Backend**: Model, Routes, API kiểm tra voucher
- **Admin Web**: Giao diện quản lý voucher chuyên nghiệp
- **Mobile App**: Tích hợp voucher vào checkout

## 🚀 Tính năng

### Backend API
1. **GET /api/vouchers** - Lấy danh sách tất cả voucher
2. **GET /api/vouchers/:id** - Lấy chi tiết voucher theo ID
3. **POST /api/vouchers/check** - Kiểm tra voucher có hợp lệ không (dùng cho checkout)
4. **POST /api/vouchers** - Thêm voucher mới
5. **PUT /api/vouchers/:id** - Cập nhật voucher
6. **DELETE /api/vouchers/:id** - Xóa voucher
7. **POST /api/vouchers/:id/used** - Tăng số lượt đã sử dụng

### Admin Web
- ✅ Giao diện quản lý voucher đầy đủ
- ✅ Thêm/Sửa/Xóa voucher
- ✅ Hiển thị trạng thái voucher (Hoạt động, Hết hạn, Hết lượt, Tắt)
- ✅ Quản lý theo dõi số lượt sử dụng
- ✅ Date picker cho thời gian hiệu lực
- ✅ Switch để bật/tắt voucher

### Mobile App Checkout
- ✅ Nhập mã voucher
- ✅ Kiểm tra tính hợp lệ qua API
- ✅ Hiển thị thông tin voucher đã áp dụng
- ✅ Tính toán giảm giá tự động
- ✅ Hỗ trợ 2 loại: Phần trăm (%) và Số tiền cố định
- ✅ Reset voucher sau khi đặt hàng thành công

## 📁 Cấu trúc Files

### Backend
```
backend/
├── model/
│   └── Voucher.js           # Model Voucher với validation đầy đủ
├── routes/
│   └── voucherRoutes.js     # Routes API voucher
└── app.js                   # Đăng ký route voucher
```

### Admin Web
```
admin-web/src/components/
├── AdminLayout.jsx          # Thêm tab Vouchers vào sidebar
└── Vouchers.jsx             # Component quản lý voucher
```

### Mobile App
```
my-app/app/
└── checkout.tsx             # Tích hợp voucher vào checkout
```

## 🎯 Model Voucher

```javascript
{
  code: String,                    // Mã voucher (unique, uppercase)
  name: String,                    // Tên voucher
  description: String,             // Mô tả
  discountType: 'percent' | 'fixed', // Loại giảm giá
  discountValue: Number,           // Giá trị giảm
  minOrderAmount: Number,          // Đơn hàng tối thiểu
  maxDiscountAmount: Number,       // Giảm tối đa (cho percent)
  quantity: Number,                // Số lượng voucher
  usedCount: Number,               // Đã sử dụng
  startDate: Date,                 // Ngày bắt đầu
  endDate: Date,                   // Ngày kết thúc
  isActive: Boolean,               // Trạng thái hoạt động
  createdBy: String                // Người tạo
}
```

## 🔧 API Endpoints Chi tiết

### POST /api/vouchers/check

**Request:**
```json
{
  "code": "WELCOME10",
  "orderAmount": 500000
}
```

**Response (Success):**
```json
{
  "valid": true,
  "voucher": {
    "code": "WELCOME10",
    "name": "Khuyến mãi đặc biệt 10%",
    "description": "Giảm 10% cho đơn hàng đầu tiên",
    "discountValue": 10,
    "discountType": "percent",
    "maxDiscountAmount": 100000
  },
  "discount": 50000
}
```

**Response (Error):**
```json
{
  "message": "Voucher đã hết hạn!"
}
```

### POST /api/vouchers

**Request:**
```json
{
  "code": "SUMMER2024",
  "name": "Khuyến mãi mùa hè",
  "description": "Giảm 15% cho mùa hè",
  "discountType": "percent",
  "discountValue": 15,
  "minOrderAmount": 200000,
  "maxDiscountAmount": 50000,
  "quantity": 100,
  "startDate": "2024-06-01 00:00:00",
  "endDate": "2024-08-31 23:59:59",
  "isActive": true
}
```

## 📊 Validation Logic

Hệ thống tự động kiểm tra:
1. ✅ Voucher có tồn tại không
2. ✅ Voucher có đang active không
3. ✅ Voucher còn trong thời gian hiệu lực (startDate → endDate)
4. ✅ Voucher còn lượt sử dụng (usedCount < quantity)
5. ✅ Đơn hàng đạt giá trị tối thiểu (orderAmount >= minOrderAmount)
6. ✅ Tính toán đúng discount theo type:
   - **percent**: (orderAmount × discountValue / 100), không vượt maxDiscountAmount
   - **fixed**: discountValue

## 🎨 UI/UX Features

### Admin Web
- Table responsive với các cột chính
- Status tags theo màu sắc
- Date picker với format VN
- Form validation đầy đủ
- Loading states
- Success/Error messages

### Mobile App
- Input voucher với auto-capitalize
- Hiển thị thông tin voucher khi áp dụng
- Xóa voucher dễ dàng
- Tính toán và hiển thị discount rõ ràng
- Alert messages thân thiện

## 🧪 Testing

### Test Backend
```bash
# Khởi động backend
cd backend
npm start

# Test API
curl -X GET http://localhost:3000/api/vouchers
```

### Test Admin Web
```bash
# Khởi động admin web
cd admin-web
npm start

# Truy cập: http://localhost:3001
# Click vào icon TagsOutlined để vào trang Vouchers
```

### Test Mobile App
```bash
# Khởi động mobile app
cd my-app
npx expo start

# Vào checkout page và nhập voucher code
```

## 📝 Ví dụ sử dụng

### 1. Tạo voucher trong Admin
1. Đăng nhập Admin Web
2. Click icon Voucher (TagsOutlined)
3. Click "Thêm Voucher"
4. Điền form:
   - Mã: WELCOME10
   - Tên: Khuyến mãi chào mừng
   - Loại: Phần trăm
   - Giá trị: 10
   - Số lượng: 100
   - Thời gian: 01/01/2024 - 31/12/2024
5. Save

### 2. Áp dụng voucher trong Mobile
1. Vào Checkout page
2. Cuộn xuống phần "Voucher / Mã giảm giá"
3. Nhập mã: WELCOME10
4. Click "Áp dụng"
5. Xem discount được tính tự động
6. Đặt hàng

## 🔄 Workflow

```
Admin tạo voucher 
    ↓
Voucher lưu vào MongoDB
    ↓
User nhập mã trong checkout
    ↓
App gọi API /check để validate
    ↓
Backend kiểm tra điều kiện
    ↓
Trả về discount
    ↓
App áp dụng discount vào tổng tiền
    ↓
User xác nhận đặt hàng
```

## 🎉 Hoàn thành

Tất cả tính năng đã được triển khai thành công:
- ✅ Backend Model & API
- ✅ Admin Web Quản lý
- ✅ Mobile App Tích hợp
- ✅ Validation đầy đủ
- ✅ UI/UX chuyên nghiệp
- ✅ Error handling
- ✅ Responsive design

## 🚀 Bước tiếp theo (Optional)

1. Thêm analytics: Theo dõi voucher nào được dùng nhiều nhất
2. Thêm notification: Thông báo voucher sắp hết hạn
3. Thêm promotion: Hiển thị voucher đang active trên Home page
4. Thêm user history: Lịch sử voucher đã dùng
5. Thêm multi-voucher: Cho phép user dùng nhiều voucher cùng lúc

---

**Developer:** AI Assistant  
**Date:** 2024  
**Version:** 1.0.0

