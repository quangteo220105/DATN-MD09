# Hướng dẫn tích hợp OpenAI vào ChatAI

## Bước 1: Thu hồi API key cũ (QUAN TRỌNG!)

1. Truy cập: https://platform.openai.com/api-keys
2. Tìm và XÓA key cũ bắt đầu bằng `sk-proj-YLdVKUfFj7rH...`
3. Tạo key mới

## Bước 2: Cài đặt thư viện

Mở terminal trong thư mục `my-app` và chạy:

```bash
npm install openai
```

## Bước 3: Cấu hình API key

1. Mở file `my-app/.env`
2. Thay `YOUR_NEW_OPENAI_API_KEY` bằng key mới của bạn:

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY_HERE
```

3. **QUAN TRỌNG**: File `.env` đã được thêm vào `.gitignore` để không bị commit lên Git

## Bước 4: Restart Expo

Sau khi thay đổi file `.env`, bạn cần restart Expo:

```bash
# Dừng Expo (Ctrl+C)
# Xóa cache
npx expo start -c
```

## Bước 5: Sử dụng trong code

File `chatAI.tsx` đã được cập nhật để sử dụng OpenAI API. Key sẽ được lấy từ:

```typescript
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
```

## Lưu ý bảo mật

✅ **NÊN LÀM:**
- Lưu API key trong file `.env`
- Thêm `.env` vào `.gitignore`
- Tạo key mới nếu bị lộ

❌ **KHÔNG NÊN:**
- Commit API key lên Git
- Chia sẻ key qua chat/email
- Hard-code key trong source code
- Sử dụng key đã bị lộ

## Kiểm tra

Sau khi setup xong, mở app và thử chat với AI. Nếu có lỗi, kiểm tra:

1. API key đã đúng chưa
2. Đã restart Expo chưa
3. Đã cài đặt `openai` package chưa
4. Console log có báo lỗi gì không
