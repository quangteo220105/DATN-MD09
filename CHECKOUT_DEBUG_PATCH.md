# Debug Patch cho checkout.tsx - Kiểm tra sản phẩm dừng bán

## Vấn đề
Khi admin ấn dừng bán, checkout.tsx không hiển thị thông báo.

## Nguyên nhân có thể
1. `item.id` không đúng (có thể là `item._id` hoặc `item.productId`)
2. Hàm không được gọi đúng lúc
3. Logic kiểm tra `isActive` không chính xác

## Giải pháp: Thay thế hàm checkStoppedProducts với version có logging

Tìm hàm `checkStoppedProducts` trong file `my-app/app/checkout.tsx` (khoảng dòng 383) và thay thế bằng code sau:

```typescript
// 🟢 Kiểm tra sản phẩm dừng bán
const checkStoppedProducts = React.useCallback(async (items: any[]) => {
  if (items.length === 0) return false;

  console.log('[Checkout] 🔍 Checking stopped products for items:', items.length);
  console.log('[Checkout] Items:', items.map(i => ({ id: i.id, _id: i._id, productId: i.productId, name: i.name })));

  try {
    // Kiểm tra từng sản phẩm trong giỏ
    const checkPromises = items.map(async (item) => {
      try {
        // Thử nhiều cách lấy product ID
        const productId = item.id || item._id || item.productId;
        console.log('[Checkout] 🔍 Checking product:', {
          productId,
          name: item.name,
          originalItem: { id: item.id, _id: item._id, productId: item.productId }
        });
        
        if (!productId) {
          console.log('[Checkout] ⚠️ No product ID found for item:', item.name);
          return null;
        }
        
        const url = `${BASE_URL}/products/${productId}`;
        console.log('[Checkout] 📡 Fetching:', url);
        
        const response = await fetch(url);
        console.log('[Checkout] 📡 Response status:', response.status);
        
        if (!response.ok) {
          console.log('[Checkout] ❌ Product not found:', productId);
          return null;
        }
        
        const productData = await response.json();
        console.log('[Checkout] 📦 Product data:', {
          id: productId,
          name: productData.name,
          isActive: productData.isActive,
          type: typeof productData.isActive
        });
        
        // Kiểm tra isActive === false (chính xác)
        if (productData.isActive === false) {
          console.log('[Checkout] 🚨 STOPPED PRODUCT FOUND:', productData.name);
          return {
            id: productId,
            name: item.name || productData.name,
            isStopped: true
          };
        }
        
        console.log('[Checkout] ✅ Product is active:', productData.name);
        return null;
      } catch (error) {
        console.error('[Checkout] ❌ Error checking product:', error);
        return null;
      }
    });

    const stoppedProducts = (await Promise.all(checkPromises)).filter(p => p !== null);
    console.log('[Checkout] 📊 Stopped products found:', stoppedProducts.length);
    console.log('[Checkout] 📊 Stopped products:', stoppedProducts);

    if (stoppedProducts.length > 0) {
      const productNames = stoppedProducts.map(p => p.name).join(', ');
      console.log('[Checkout] 🚨🚨🚨 SHOWING ALERT for stopped products:', productNames);
      
      Alert.alert(
        'Sản phẩm dừng bán',
        `Các sản phẩm sau đã dừng bán: ${productNames}`,
        [
          {
            text: 'Xác nhận',
            onPress: () => {
              console.log('[Checkout] ✅ User confirmed, navigating to home');
              router.replace('/(tabs)/home');
            }
          }
        ],
        { cancelable: false }
      );
      return true;
    }
    
    console.log('[Checkout] ✅ No stopped products found');
    return false;
  } catch (error) {
    console.error('[Checkout] ❌ Error checking stopped products:', error);
    return false;
  }
}, [router]);
```

## Cách test

1. Thay thế hàm `checkStoppedProducts` bằng code trên
2. Mở console/terminal để xem logs
3. Vào màn checkout với sản phẩm trong giỏ
4. Ở admin, ấn "Dừng bán" sản phẩm đó
5. Đợi 2 giây
6. Xem console logs để debug:
   - Kiểm tra `productId` có đúng không
   - Kiểm tra API response
   - Kiểm tra `isActive` value
   - Kiểm tra Alert có được gọi không

## Các logs quan trọng cần xem

- `🔍 Checking stopped products for items:` - Số lượng items
- `📡 Fetching:` - URL API được gọi
- `📦 Product data:` - Data trả về từ API
- `🚨 STOPPED PRODUCT FOUND:` - Phát hiện sản phẩm dừng bán
- `🚨🚨🚨 SHOWING ALERT` - Alert được hiển thị

Nếu không thấy log `🚨 STOPPED PRODUCT FOUND`, có nghĩa là:
- `productData.isActive` không phải `false`
- Hoặc API không trả về đúng data
- Hoặc `productId` không đúng
