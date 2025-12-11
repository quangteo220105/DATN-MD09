# Giải pháp cho lỗi OpenAI Quota (Error 429)

## Vấn đề
```
ERROR 429: You exceeded your current quota
```

Tài khoản OpenAI của bạn đã hết quota (credit).

## Nguyên nhân
1. Đã dùng hết $5 credit miễn phí
2. Hoặc tài khoản chưa có phương thức thanh toán
3. Hoặc key cũ bị lộ, người khác đã dùng hết quota

## Giải pháp

### Giải pháp 1: Nạp tiền vào tài khoản (Khuyến nghị nếu muốn dùng OpenAI)

1. Truy cập: https://platform.openai.com/account/billing
2. Click "Add payment method"
3. Thêm thẻ tín dụng/ghi nợ
4. Nạp tối thiểu $5
5. Tạo API key MỚI
6. Cập nhật vào file `.env`

**Chi phí:**
- GPT-3.5-turbo: ~$0.002 / 1000 tokens
- 1 câu hỏi trung bình: ~500 tokens = $0.001
- $5 = ~5000 câu hỏi

### Giải pháp 2: Tạo tài khoản OpenAI mới (Miễn phí)

1. Đăng ký tài khoản mới với email khác
2. Nhận $5 credit miễn phí
3. Tạo API key mới
4. Cập nhật vào file `.env`

**Lưu ý:** Mỗi tài khoản chỉ được $5 miễn phí 1 lần

### Giải pháp 3: Sử dụng logic AI có sẵn (MIỄN PHÍ - Đang dùng)

**App hiện tại đã tắt OpenAI và dùng logic AI có sẵn.**

✅ **Vẫn hoạt động tốt:**
- Trả lời chính xác về giá, màu, size
- Kiểm tra tồn kho
- Gợi ý sản phẩm phù hợp
- Tư vấn theo nhu cầu
- Không tốn phí

❌ **Hạn chế:**
- Không linh hoạt như GPT
- Chỉ trả lời theo pattern có sẵn
- Không hiểu ngữ cảnh phức tạp

## So sánh

| Tính năng | Logic AI có sẵn | OpenAI GPT |
|-----------|----------------|------------|
| Chi phí | MIỄN PHÍ | $5-20/tháng |
| Trả lời giá | ✅ Chính xác | ✅ Chính xác |
| Trả lời màu/size | ✅ Chính xác | ✅ Chính xác |
| Gợi ý sản phẩm | ✅ Tốt | ✅ Rất tốt |
| Hiểu ngữ cảnh | ⚠️ Cơ bản | ✅ Xuất sắc |
| Trả lời tự nhiên | ⚠️ Theo mẫu | ✅ Linh hoạt |

## Khuyến nghị

**Cho dự án học tập/demo:**
→ Dùng logic AI có sẵn (MIỄN PHÍ)

**Cho sản phẩm thực tế:**
→ Nạp tiền OpenAI ($5-10/tháng)

## Kích hoạt lại OpenAI

Khi đã có quota, trong file `chatAI.tsx` đổi:

```typescript
const useOpenAI = true;
```

Và restart Expo:
```bash
npx expo start -c
```

## Kiểm tra quota hiện tại

Truy cập: https://platform.openai.com/usage

Xem:
- Credit còn lại
- Lịch sử sử dụng
- Hạn mức
