# Hướng dẫn cài đặt AsyncStorage

## Cài đặt thư viện

Để sử dụng AsyncStorage, bạn cần cài đặt thư viện:

### Cách 1: Sử dụng Command Prompt (khuyến nghị)
1. Mở Command Prompt (cmd) thay vì PowerShell
2. Chạy lệnh:
   ```cmd
   cd C:\DATN\DATN-MD09\my-app
   npm install @react-native-async-storage/async-storage
   ```

### Cách 2: Sử dụng PowerShell (nếu có quyền)
1. Mở PowerShell với quyền Administrator
2. Chạy lệnh:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   cd C:\DATN\DATN-MD09\my-app
   npm install @react-native-async-storage/async-storage
   ```

## Sau khi cài đặt

1. **Rebuild ứng dụng:**
   ```cmd
   cd C:\DATN\DATN-MD09\my-app
   npx expo start --clear
   ```

2. **Hoặc nếu sử dụng máy giả lập:**
   ```cmd
   npx expo run:android
   ```

## Kiểm tra cài đặt

Sau khi cài đặt, kiểm tra file `package.json` trong thư mục `my-app` để đảm bảo có dòng:
```json
"@react-native-async-storage/async-storage": "^1.x.x"
```

## Cách hoạt động

1. **Đăng ký:** Sau khi đăng ký thành công, thông tin user sẽ được lưu vào AsyncStorage và chuyển thẳng đến Home
2. **Đăng nhập:** Sau khi đăng nhập thành công, thông tin user sẽ được lưu vào AsyncStorage và chuyển đến Home
3. **Home:** Màn hình Home sẽ tự động lấy thông tin user từ AsyncStorage và hiển thị tên + avatar

## Lưu ý

- Nếu gặp lỗi "Cannot find module", hãy đảm bảo đã cài đặt AsyncStorage
- Nếu vẫn gặp lỗi, thử xóa `node_modules` và cài lại:
  ```cmd
  cd C:\DATN\DATN-MD09\my-app
  rmdir /s node_modules
  npm install
  ```

