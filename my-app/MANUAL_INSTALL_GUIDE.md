# Hướng dẫn cài đặt AsyncStorage thủ công

## Vấn đề hiện tại:
- Bạn đã đăng nhập thành công và có thông tin user
- Nhưng Home.tsx không hiển thị avatar và tên vì AsyncStorage chưa được cài đặt

## Giải pháp:

### Cách 1: Sử dụng Command Prompt (khuyến nghị)

1. **Mở Command Prompt (cmd)** thay vì PowerShell:
   - Nhấn `Win + R`
   - Gõ `cmd` và nhấn Enter

2. **Điều hướng đến thư mục dự án:**
   ```cmd
   cd C:\DATN\DATN-MD09\my-app
   ```

3. **Cài đặt AsyncStorage:**
   ```cmd
   npm install @react-native-async-storage/async-storage
   ```

### Cách 2: Sử dụng PowerShell với quyền Administrator

1. **Mở PowerShell với quyền Administrator**
2. **Thay đổi execution policy:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. **Cài đặt AsyncStorage:**
   ```powershell
   cd C:\DATN\DATN-MD09\my-app
   npm install @react-native-async-storage/async-storage
   ```

### Cách 3: Cài đặt thủ công

1. **Mở file `package.json`** trong thư mục `my-app`
2. **Thêm dòng này vào phần `dependencies`:**
   ```json
   "@react-native-async-storage/async-storage": "^1.21.0"
   ```
3. **Chạy lệnh:**
   ```cmd
   npm install
   ```

## Sau khi cài đặt:

1. **Rebuild ứng dụng:**
   ```cmd
   cd C:\DATN\DATN-MD09\my-app
   npx expo start --clear
   ```

2. **Hoặc nếu sử dụng máy giả lập:**
   ```cmd
   npx expo run:android
   ```

## Kiểm tra cài đặt:

Sau khi cài đặt, kiểm tra file `package.json` để đảm bảo có dòng:
```json
"@react-native-async-storage/async-storage": "^1.21.0"
```

## Kết quả mong đợi:

Sau khi cài đặt và rebuild:
1. **Đăng nhập** với tài khoản của bạn
2. **Màn hình Home** sẽ hiển thị:
   - Tên: "Lê Nhật Quang"
   - Avatar: Ảnh bạn đã chọn khi đăng ký

## Nếu vẫn gặp lỗi:

1. **Xóa node_modules và cài lại:**
   ```cmd
   cd C:\DATN\DATN-MD09\my-app
   rmdir /s node_modules
   npm install
   ```

2. **Kiểm tra kết nối internet**
3. **Thử sử dụng yarn thay vì npm:**
   ```cmd
   yarn add @react-native-async-storage/async-storage
   ```

