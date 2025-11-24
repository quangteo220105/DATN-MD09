# Hướng dẫn hoàn chỉnh: Sửa lỗi checkout không hiện thông báo dừng bán

## Tình trạng hiện tại
- ✅ Backend có route `/toggle-stop`
- ✅ Admin có nút "Dừng bán"
- ✅ Mobile có hàm `checkStoppedProducts`
- ❌ Checkout KHÔNG hiện thông báo khi admin ấn dừng bán

## Nguyên nhân
Từ log: `[Checkout] Product isActive: Brooks Ghost true`
→ Sau khi admin ấn dừng bán, mobile vẫn nhận `isActive = true`

Có thể do:
1. Admin không gọi đúng API
2. Backend không cập nhật database
3. Mobile check quá nhanh (trước khi backend cập nhật xong)
4. Không có interval để check liên tục

## Giải pháp: Thêm interval check trong useFocusEffect

### Bước 1: Tìm useFocusEffect trong checkout.tsx

Tìm đoạn code này (khoảng dòng 500-540):

```typescript
useFocusEffect(
  React.useCallback(() => {
    const reload = async () => {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return;

      setUserId(user._id);
      const addressString = await AsyncStorage.getItem(`address_${user._id}`);
      const addr = addressString ? JSON.parse(addressString) : { name: user.name || '', phone: '', address: '' };
      setAddressObj(addr);

      // ✅ CHỈ reload address, KHÔNG reload cart để giữ nguyên buy_now
      // Cart đã được load trong useEffect ban đầu
    };
    reload();

    // ❌ KHÔNG xóa buy_now ở đây vì sẽ bị xóa khi chuyển sang address-book
    // buy_now sẽ được xóa trong confirmOrder sau khi thanh toán thành công
  }, [])
);
```

### Bước 2: THAY THẾ bằng code mới có interval

```typescript
useFocusEffect(
  React.useCallback(() => {
    const reload = async () => {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return;

      setUserId(user._id);
      const addressString = await AsyncStorage.getItem(`address_${user._id}`);
      const addr = addressString ? JSON.parse(addressString) : { name: user.name || '', phone: '', address: '' };
      setAddressObj(addr);

      // ✅ Kiểm tra sản phẩm dừng bán khi focus
      if (cart.length > 0) {
        console.log('[Checkout] 🔍 Initial check for stopped products');
        await checkStoppedProducts(cart);
      }
    };
    reload();

    // ✅ Auto-check sản phẩm dừng bán mỗi 5 giây
    const interval = setInterval(async () => {
      if (cart.length > 0) {
        const now = new Date().toLocaleTimeString();
        console.log(`[Checkout] 🔄 [${now}] Auto-checking stopped products...`);
        await checkStoppedProducts(cart);
      }
    }, 5000); // 5 giây

    return () => {
      console.log('[Checkout] 🛑 Clearing interval');
      clearInterval(interval);
    };
  }, [cart, checkStoppedProducts])
);
```

### Bước 3: Test

1. **Mở mobile app**, vào checkout với sản phẩm Brooks Ghost
2. **Xem console**, phải thấy:
   ```
   [Checkout] 🔍 Initial check for stopped products
   [Checkout] Checking product: 69209170590eb33a2d003c10 Brooks Ghost
   [Checkout] Product isActive: Brooks Ghost true
   ```

3. **Ở admin**, ấn "Dừng bán" Brooks Ghost

4. **Đợi 5-10 giây**, xem console mobile:
   ```
   [Checkout] 🔄 [14:30:15] Auto-checking stopped products...
   [Checkout] Checking product: 69209170590eb33a2d003c10 Brooks Ghost
   [Checkout] Product isActive: Brooks Ghost false  ← PHẢI LÀ FALSE
   [Checkout] 🚨 STOPPED PRODUCT FOUND: Brooks Ghost
   [Checkout] 🚨 SHOWING ALERT for: Brooks Ghost
   ```

5. **Alert phải hiện** với message "Các sản phẩm sau đã dừng bán: Brooks Ghost"

## Nếu vẫn không hoạt động

### Kiểm tra 1: Admin có gọi API không?

Mở console admin (F12), ấn "Dừng bán", xem có log không.

Nếu KHÔNG có log → Admin không gọi API → Kiểm tra lại `toggleStopProduct` trong Product.jsx

### Kiểm tra 2: Backend có nhận request không?

Xem console backend server, phải thấy:
```
🔄 [Toggle Stop] Request received for product: 69209170590eb33a2d003c10
📦 [Toggle Stop] Current isActive: true
✅ [Toggle Stop] Updated isActive: false
```

Nếu KHÔNG thấy → Backend không nhận request → Kiểm tra URL trong admin

### Kiểm tra 3: Database có cập nhật không?

Chạy script test:
```bash
node test-stop-selling-api.js
```

Xem kết quả có `✅ Sản phẩm đã được dừng bán thành công!` không

### Kiểm tra 4: Mobile có gọi API đúng không?

Xem log mobile:
- `[Checkout] Checking product: 69209170590eb33a2d003c10` ← Product ID đúng
- `[Checkout] Product isActive: Brooks Ghost false` ← Phải là false

Nếu vẫn là `true` sau 10 giây → Backend chưa cập nhật hoặc cache

## Giải pháp khẩn cấp

Nếu tất cả đều không hoạt động, thử:

1. **Restart backend server**
2. **Restart mobile app** (kill và mở lại)
3. **Clear cache mobile**: Xóa app và cài lại
4. **Kiểm tra database** bằng MongoDB Compass xem `isActive` có thay đổi không

## Kết luận

Với interval 5 giây, sau khi admin ấn dừng bán:
- Tối đa 5 giây → Mobile sẽ check lại
- Nếu `isActive = false` → Hiện alert
- User ấn "Xác nhận" → Chuyển về home

Nếu vẫn không hoạt động sau khi làm theo hướng dẫn, có thể:
- Backend route không đúng
- Database connection có vấn đề
- Model Product không có trường `isActive`

Hãy làm theo từng bước và gửi cho tôi:
1. Console log của admin khi ấn "Dừng bán"
2. Console log của backend server
3. Console log của mobile app sau 10 giây
