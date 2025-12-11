# Hướng dẫn Debug OpenAI API

## Vấn đề hiện tại
Lỗi 401: API key không hợp lệ

## Các bước kiểm tra

### 1. Kiểm tra API key trong file .env

Mở file `my-app/.env` và kiểm tra:

```bash
# Key phải trên 1 dòng, không xuống dòng
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-YOUR_COMPLETE_KEY_HERE
```

**Lưu ý:**
- Key phải bắt đầu bằng `sk-proj-`
- Không có khoảng trắng trước/sau
- Không xuống dòng giữa chừng
- Độ dài thường ~200-250 ký tự

### 2. Kiểm tra key trên OpenAI Platform

1. Truy cập: https://platform.openai.com/api-keys
2. Kiểm tra key có tồn tại không
3. Nếu key bị thu hồi hoặc không tồn tại → Tạo key MỚI
4. Copy TOÀN BỘ key (click vào icon copy)

### 3. Cập nhật key mới

1. Mở `my-app/.env`
2. Xóa dòng cũ
3. Paste key mới:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-[KEY_MỚI_CỦA_BẠN]
   ```
4. Save file

### 4. Restart Expo (QUAN TRỌNG!)

```bash
# Dừng Expo (Ctrl+C trong terminal)
# Xóa cache và restart
cd my-app
npx expo start -c
```

**Lưu ý:** Expo chỉ load file `.env` khi khởi động, nên PHẢI restart sau khi thay đổi!

### 5. Kiểm tra log trong app

Sau khi restart, mở app và chat với AI. Xem console log:

```
🔑 Using OpenAI key: sk-proj-Jv...ukA
🔑 Key length: 200
```

Nếu thấy log này → Key đã được load
Nếu thấy "❌ OpenAI API key not found" → Key chưa được load

### 6. Test API key bằng script

Chạy script test:

```bash
cd my-app
node test-openai-key.js
```

Nếu thấy "✅ OpenAI API works!" → Key hợp lệ
Nếu thấy lỗi 401 → Key không đúng

## Các lỗi thường gặp

### Lỗi 401: Incorrect API key
**Nguyên nhân:**
- Key bị copy thiếu ký tự
- Key đã bị thu hồi
- Key có khoảng trắng/xuống dòng

**Giải pháp:**
- Tạo key MỚI trên OpenAI Platform
- Copy lại cẩn thận
- Restart Expo

### Lỗi 429: Rate limit exceeded
**Nguyên nhân:**
- Đã hết quota miễn phí ($5)
- Gọi API quá nhiều

**Giải pháp:**
- Nạp tiền vào tài khoản OpenAI
- Hoặc tạo tài khoản mới
- Hoặc tắt OpenAI (đổi `useOpenAI = false`)

### Key không được load
**Nguyên nhân:**
- Chưa restart Expo sau khi thay đổi .env
- File .env không đúng vị trí (phải ở `my-app/.env`)
- Tên biến không đúng (phải là `EXPO_PUBLIC_OPENAI_API_KEY`)

**Giải pháp:**
- Restart Expo với `-c` flag
- Kiểm tra vị trí file .env
- Kiểm tra tên biến

## Giải pháp tạm thời

Nếu không thể khắc phục, tắt OpenAI:

Trong `chatAI.tsx`, đổi:
```typescript
const useOpenAI = false;
```

App vẫn hoạt động tốt với logic AI có sẵn!

## Liên hệ hỗ trợ

- OpenAI Help: https://help.openai.com
- OpenAI Status: https://status.openai.com
