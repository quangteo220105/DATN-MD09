# Code cần thêm vào Mobile App

## File: my-app/app/product/[id].tsx

### 1. Đã thêm interface (✅ Done):
```typescript
interface Product {
    // ... existing fields
    isStopped?: boolean; // ✅ Đã thêm
}
```

### 2. Thêm vào ĐÚNG VỊ TRÍ của các functions thêm giỏ hàng/mua ngay:

Tìm function có tên như: `handleAddToCart`, `addToCart`, `handleBuyNow`, hoặc nút có text "Thêm vào giỏ" / "Mua ngay"

Thêm kiểm tra này VÀO ĐẦU function:

```typescript
// Kiểm tra sản phẩm có bị dừng bán không
if (product?.isStopped) {
    Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
    return;
}
```

## File: my-app/app/checkout.tsx

### Thêm function kiểm tra sản phẩm dừng bán:

```typescript
// Thêm vào đầu component, sau các state declarations
const checkStoppedProducts = async () => {
    try {
        const stoppedProducts = [];
        
        for (const item of cartItems) {
            const productId = item.productId || item._id;
            if (!productId) continue;
            
            try {
                const res = await fetch(`${BASE_URL}/shoes/${productId}`);
                if (res.ok) {
                    const product = await res.json();
                    if (product.isStopped) {
                        stoppedProducts.push(product.name || item.name);
                    }
                }
            } catch (e) {
                console.log('Error checking product:', e);
            }
        }
        
        if (stoppedProducts.length > 0) {
            Alert.alert(
                'Sản phẩm dừng bán',
                `Các sản phẩm sau đã dừng bán:\n${stoppedProducts.join('\n')}\n\nVui lòng xóa khỏi giỏ hàng.`,
                [
                    {
                        text: 'Về trang chủ',
                        onPress: () => router.replace('/(tabs)/home')
                    }
                ]
            );
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking stopped products:', error);
        return false;
    }
};
```

### Gọi function khi vào màn hình:

```typescript
// Thêm vào useEffect hoặc useFocusEffect
useFocusEffect(
    React.useCallback(() => {
        checkStoppedProducts();
    }, [cartItems])
);
```

### Gọi function trước khi thanh toán:

Tìm function thanh toán (có tên như `handleCheckout`, `handlePayment`, `processOrder`)

Thêm vào ĐẦU function:

```typescript
const hasStoppedProducts = await checkStoppedProducts();
if (hasStoppedProducts) {
    return;
}
```

## Test:
1. Restart backend
2. Admin: Bấm "Dừng bán" một sản phẩm
3. Mobile: Vào chi tiết sản phẩm → Thử thêm giỏ hàng → Thấy thông báo
4. Mobile: Nếu đang ở checkout → Tự động thông báo và về home
