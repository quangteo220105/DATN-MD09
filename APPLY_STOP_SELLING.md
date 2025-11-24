# Áp dụng kiểm tra "Dừng bán" - Hướng dẫn đơn giản

## ✅ Backend đã xong 100%
- Restart backend để áp dụng

## 📱 Mobile App - 2 thay đổi đơn giản:

### 1. File: my-app/app/checkout.tsx

**Thêm đoạn code này SAU dòng `import { useFocusEffect } from '@react-navigation/native';`**
**và TRƯỚC dòng `export default function`:**

```typescript
// Function kiểm tra sản phẩm dừng bán
async function checkIfProductsStopped(cartItems: any[], router: any) {
    try {
        const stoppedProducts = [];
        for (const item of cartItems) {
            const productId = item.productId || item._id;
            if (!productId) continue;
            try {
                const res = await fetch(`http://localhost:3000/api/shoes/${productId}`);
                if (res.ok) {
                    const product = await res.json();
                    if (product.isStopped) {
                        stoppedProducts.push(product.name || item.name);
                    }
                }
            } catch (e) {}
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
}
```

**Sau đó, TÌM dòng có `useFocusEffect` hoặc `useEffect` đầu tiên trong component**
**THÊM đoạn này:**

```typescript
useFocusEffect(
    React.useCallback(() => {
        if (cartItems && cartItems.length > 0) {
            checkIfProductsStopped(cartItems, router);
        }
    }, [cartItems])
);
```

**Cuối cùng, TÌM function thanh toán (tìm text "Đặt hàng" hoặc "handleCheckout" hoặc "processOrder")**
**THÊM VÀO ĐẦU function:**

```typescript
const hasStoppedProducts = await checkIfProductsStopped(cartItems, router);
if (hasStoppedProducts) return;
```

### 2. File: my-app/app/product/[id].tsx

**TÌM bất kỳ function nào có:**
- `AsyncStorage.setItem` với 'cart'
- Hoặc `router.push('/checkout')`

**THÊM VÀO ĐẦU function:**

```typescript
if (product?.isStopped) {
    Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
    return;
}
```

## Xong! Restart backend và test.
