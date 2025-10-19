# Hướng dẫn cài đặt thư viện

Để sử dụng chức năng chọn ảnh avatar, bạn cần cài đặt thư viện `expo-image-picker`:

```bash
cd my-app
npm install expo-image-picker
```

Sau khi cài đặt xong, bạn có thể chạy ứng dụng:

```bash
npm start
```

## Các thay đổi đã thực hiện:

1. **Backend (User Model)**: Thêm thuộc tính `avatar` vào User schema
2. **Backend (API)**: Cập nhật API đăng ký để xử lý upload avatar
3. **Frontend (Register)**: Thêm chức năng chọn ảnh từ điện thoại
4. **Frontend (Home)**: Hiển thị tên và avatar người dùng

## Lưu ý:

- Trong Home.tsx, tôi đã sử dụng một userId mặc định để test. Trong thực tế, bạn nên lưu userId sau khi đăng nhập thành công và sử dụng nó để lấy thông tin user.
- Để lưu userId, bạn có thể sử dụng AsyncStorage hoặc Context API.

