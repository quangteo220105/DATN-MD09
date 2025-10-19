# Hướng dẫn khắc phục vấn đề chọn ảnh avatar

## Vấn đề: Không thấy nút "Done" khi chọn ảnh

### Nguyên nhân:
- Một số phiên bản của `expo-image-picker` có vấn đề với giao diện editing mode
- Máy giả lập có thể không hiển thị đúng các nút điều khiển

### Giải pháp:

#### 1. **Sử dụng tùy chọn "Chọn ảnh (không crop)"**
- Khi bấm chọn ảnh, chọn "Chọn ảnh (không crop)"
- Ảnh sẽ được chọn trực tiếp mà không cần qua bước crop
- Phù hợp nếu ảnh của bạn đã có tỷ lệ vuông

#### 2. **Nếu muốn crop ảnh:**
- Chọn "Chọn ảnh (có crop)"
- Trong màn hình crop, tìm các nút sau:
  - **Nút "✓" (checkmark)** ở góc trên bên phải
  - **Nút "Done"** ở góc dưới bên phải
  - **Nút "CẮT"** (nếu giao diện tiếng Việt)

#### 3. **Các phím tắt trên máy giả lập:**
- **Android Emulator**: Nhấn `Ctrl + S` để lưu
- **iOS Simulator**: Nhấn `Cmd + S` để lưu

#### 4. **Nếu vẫn không thấy nút:**
- Thử vuốt từ dưới lên trên màn hình crop
- Kiểm tra xem có thanh điều hướng ẩn không
- Thử nhấn vào vùng trống xung quanh ảnh

### Cách test:

1. **Chạy ứng dụng:**
   ```bash
   cd my-app
   npx expo start
   ```

2. **Vào màn hình đăng ký**
3. **Bấm vào vùng chọn ảnh avatar**
4. **Chọn một trong hai tùy chọn:**
   - "Chọn ảnh (không crop)" - Đơn giản, nhanh chóng
   - "Chọn ảnh (có crop)" - Có thể chỉnh sửa ảnh

### Lưu ý:
- Nếu chọn "không crop", ảnh sẽ được tự động resize về tỷ lệ vuông
- Nếu chọn "có crop", bạn có thể điều chỉnh vùng ảnh trước khi xác nhận
- Sau khi chọn ảnh thành công, sẽ có thông báo "Đã chọn ảnh avatar thành công!"

