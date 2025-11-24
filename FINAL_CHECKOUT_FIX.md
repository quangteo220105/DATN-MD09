# Giải pháp cuối cùng cho checkout.tsx - Kiểm tra sản phẩm dừng bán

## Vấn đề phát hiện
Từ log: `[Checkout] Product isActive: Brooks Ghost true`
- API trả về đúng
- Nhưng `isActive` vẫn là `true` sau khi admin ấn dừng bán
- Có thể do:
  1. Admin không gọi đúng API
  2. Interval 2 giây quá nhanh, chưa kịp cập nhật
  3. Cache hoặc database chưa kịp sync

## Giải pháp 1: Tăng thời gian interval và thêm delay

Trong `useFocusEffect` của checkout.tsx, thay đổi interval từ 2 giây lên 3 giây và thêm delay ban đầu:

```typescript
useFocusEffect(
  React.useCallback(() => {
    const reload = async () => {
      // ... code reload address ...
      
      // ✅ Kiểm tra sản phẩm dừng bán khi focus
      if (cart.length > 0) {
        await checkStoppedProducts(cart);
      }
    };
    reload();

    // ✅ Đợi 1 giây trước khi bắt đầu interval
    const timeoutId = setTimeout(() => {
      // ✅ Auto-check mỗi 3 giây (tăng từ 2 giây)
      const interval = setInterval(async () => {
        if (cart.length > 0) {
          console.log('[Checkout] 🔄 Auto-checking stopped products...');
          await checkStoppedProducts(cart);
        }
      }, 3000); // Tăng lên 3 giây

      return () => {
        clearInterval(interval);
      };
    }, 1000); // Đợi 1 giây

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cart, checkStoppedProducts])
);
```

## Giải pháp 2: Kiểm tra admin có gọi đúng API không

Thêm console.log vào `toggleStopProduct` trong `admin-web/src/components/Product.jsx`:

```javascript
const toggleStopProduct = async (product) => {
    const willStop = product.isActive;
    const confirmed = window.confirm(willStop
        ? "Bạn có chắc muốn dừng bán sản phẩm này?"
        : "Bạn có chắc muốn mở bán sản phẩm này?");
    if (!confirmed) return;

    console.log('🔄 [Admin] Calling toggle-stop API for:', product._id);
    console.log('🔄 [Admin] Current isActive:', product.isActive);

    try {
        const url = `http://localhost:3000/api/products/${product._id}/toggle-stop`;
        console.log('🔄 [Admin] URL:', url);
        
        const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        
        console.log('📡 [Admin] Response status:', res.status);
        const data = await res.json();
        console.log('📡 [Admin] Response data:', data);

        if (res.ok) {
            alert(data.message || (willStop ? "✅ Đã dừng bán sản phẩm." : "✅ Đã mở bán sản phẩm."));
            fetchProducts();
        } else {
            alert(data.message || "❌ Không thể cập nhật trạng thái sản phẩm!");
        }
    } catch (error) {
        console.error('❌ [Admin] Error:', error);
        alert("❌ Lỗi kết nối server!");
    }
};
```

## Giải pháp 3: Test thủ công

Chạy script test:
```bash
node test-stop-selling-api.js
```

Script này sẽ:
1. Lấy thông tin sản phẩm TRƯỚC khi toggle
2. Gọi API toggle-stop
3. Lấy thông tin sản phẩm SAU khi toggle
4. So sánh kết quả

## Giải pháp 4: Kiểm tra database trực tiếp

Nếu API hoạt động nhưng vẫn không cập nhật, kiểm tra database:

```javascript
// Thêm vào backend/routes/shoesRoutes.js sau khi save
router.put("/:id/toggle-stop", async (req, res) => {
    try {
        console.log('🔄 [Toggle Stop] Request received for product:', req.params.id);
        
        const product = await Product.findById(req.params.id);
        if (!product) {
            console.log('❌ [Toggle Stop] Product not found:', req.params.id);
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        console.log('📦 [Toggle Stop] Current isActive:', product.isActive);
        
        // Toggle trạng thái isActive
        product.isActive = !product.isActive;
        await product.save();
        
        console.log('✅ [Toggle Stop] Updated isActive:', product.isActive);
        
        // ✅ THÊM: Verify lại từ database
        const verifyProduct = await Product.findById(req.params.id);
        console.log('🔍 [Toggle Stop] Verify from DB:', verifyProduct.isActive);
        
        if (verifyProduct.isActive !== product.isActive) {
            console.log('❌ [Toggle Stop] DATABASE NOT SYNCED!');
        }

        res.status(200).json({
            success: true,
            message: product.isActive ? "Đã mở lại sản phẩm" : "Đã dừng bán sản phẩm",
            product: verifyProduct // Trả về data từ DB
        });
    } catch (error) {
        console.error("❌ Lỗi toggle dừng bán:", error);
        res.status(500).json({ message: "Không thể cập nhật trạng thái sản phẩm" });
    }
});
```

## Cách debug từng bước

### Bước 1: Kiểm tra admin
1. Mở console của admin web (F12)
2. Ấn "Dừng bán"
3. Xem console có log `🔄 [Admin] Calling toggle-stop API` không
4. Xem response status và data

### Bước 2: Kiểm tra backend
1. Xem console của backend server
2. Phải thấy log `🔄 [Toggle Stop] Request received`
3. Phải thấy `✅ [Toggle Stop] Updated isActive: false`

### Bước 3: Kiểm tra mobile
1. Đợi 3-5 giây sau khi admin ấn dừng bán
2. Xem console mobile
3. Phải thấy `[Checkout] Product isActive: Brooks Ghost false`
4. Phải thấy `[Checkout] 🚨 STOPPED PRODUCT FOUND`

### Bước 4: Nếu vẫn không hoạt động
- Restart backend server
- Restart mobile app
- Clear cache mobile app
- Kiểm tra database trực tiếp bằng MongoDB Compass

## Kết luận

Vấn đề có thể nằm ở:
1. ❌ Admin không gọi API (kiểm tra console admin)
2. ❌ Backend không nhận request (kiểm tra console backend)
3. ❌ Database không cập nhật (kiểm tra verify log)
4. ❌ Mobile check quá nhanh (tăng interval lên 3-5 giây)
5. ❌ Cache (restart app)

Hãy làm theo từng bước và cho tôi biết kết quả ở bước nào!
