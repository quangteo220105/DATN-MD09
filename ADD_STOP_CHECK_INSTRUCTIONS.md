# Hướng dẫn thêm kiểm tra "Dừng bán" vào Mobile App

## ✅ Đã hoàn thành:
1. ✅ Backend model - Thêm `isStopped` field
2. ✅ Backend API - Route `/api/products/:id/toggle-stop`
3. ✅ Admin UI - Nút "Dừng bán"
4. ✅ Mobile product/[id].tsx - Thêm `isStopped` vào interface

## 📝 Cần làm thủ công (2 bước đơn giản):

### Bước 1: Sửa file `my-app/app/product/[id].tsx`

**Tìm các function có chứa:**
- `AsyncStorage.setItem` với key chứa `cart`
- Hoặc text "Thêm vào giỏ" / "Mua ngay"
- Hoặc `router.push('/checkout')`

**Thêm kiểm tra này VÀO ĐẦU function:**

```typescript
// Kiểm tra sản phẩm dừng bán
if (product?.isStopped) {
    Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
    return;
}
```

### Bước 2: Sửa file `my-app/app/checkout.tsx`

**2.1. Thêm function kiểm tra (sau các state, trước các useEffect):**

```typescript
const checkStoppedProducts = async () => {
    try {
        const stoppedProducts = [];
        
        for (const item of cartItems) {
            const productId = item.productId || item._id;
            if (!productId) continue;
            
            const res = await fetch(`${BASE_URL}/shoes/${productId}`);
            if (res.ok) {
                const product = await res.json();
                if (product.isStopped) {
                    stoppedProducts.push(product.name || item.name);
                }
            }
        }
        
        if (stoppedProducts.length > 0) {
            Alert.alert(
                'Sản phẩm dừng bán',
                `Sản phẩm sau đã dừng bán:\n${stoppedProducts.join('\n')}`,
                [{ text: 'Về trang chủ', onPress: () => router.replace('/(tabs)/home') }]
            );
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
};
```

**2.2. Gọi khi vào màn hình (thêm vào useEffect hoặc useFocusEffect):**

```typescript
useFocusEffect(
    React.useCallback(() => {
        checkStoppedProducts();
    }, [cartItems])
);
```

**2.3. Gọi trước khi thanh toán (tìm function thanh toán, thêm vào đầu):**

```typescript
const hasStoppedProducts = await checkStoppedProducts();
if (hasStoppedProducts) return;
```

## Test:
1. **Restart backend server**
2. Admin: Bấm "Dừng bán" sản phẩm
3. Mobile: Thử thêm giỏ hàng → Thấy thông báo ✅
4. Mobile: Vào checkout → Tự động thông báo và về home ✅

## Lưu ý:
- Đã thêm `isStopped` vào Product interface ✅
- Backend đã có API ✅
- Admin đã có nút ✅
- Chỉ cần thêm 2 đoạn code kiểm tra vào mobile app
