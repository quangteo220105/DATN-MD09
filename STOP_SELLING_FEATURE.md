# Hướng dẫn thêm tính năng "Dừng bán" sản phẩm

## Yêu cầu:
1. Khi admin ấn "Dừng bán" ở Product.jsx
2. Ở product/[id].tsx: Khi ấn "Thêm giỏ hàng" hoặc "Mua ngay" → Thông báo "Sản phẩm dừng bán"
3. Ở checkout.tsx: Tự động kiểm tra và thông báo "Sản phẩm dừng bán" → Quay về home

## Bước 1: Thêm field `isStopped` vào Product model (backend)

```javascript
// backend/model/Shoes.js
const productSchema = new mongoose.Schema({
  // ... các field hiện tại
  isStopped: { type: Boolean, default: false }, // Thêm field này
}, { timestamps: true });
```

## Bước 2: Thêm API toggle stop selling (backend)

```javascript
// backend/routes/shoesRoutes.js
// PATCH /api/shoes/:id/toggle-stop
router.patch('/:id/toggle-stop', async (req, res) => {
  try {
    const product = await Shoes.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    
    product.isStopped = !product.isStopped;
    await product.save();
    
    res.json({ 
      message: product.isStopped ? 'Đã dừng bán sản phẩm' : 'Đã mở lại bán sản phẩm',
      isStopped: product.isStopped 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});
```

## Bước 3: Cập nhật Product.jsx (admin) - Thêm nút "Dừng bán"

```javascript
// admin-web/src/components/Product.jsx
// Trong phần Actions của mỗi sản phẩm, thêm:

const handleToggleStop = async (productId, currentStatus) => {
  try {
    const res = await fetch(`http://localhost:3000/api/shoes/${productId}/toggle-stop`, {
      method: 'PATCH'
    });
    const data = await res.json();
    alert(data.message);
    fetchProducts(); // Refresh danh sách
  } catch (error) {
    alert('Lỗi khi cập nhật trạng thái');
  }
};

// Trong render:
<button 
  onClick={() => handleToggleStop(product._id, product.isStopped)}
  style={{ 
    ...btnLink, 
    color: product.isStopped ? '#22c55e' : '#ef4444' 
  }}
>
  {product.isStopped ? 'Mở lại bán' : 'Dừng bán'}
</button>
```

## Bước 4: Cập nhật product/[id].tsx - Kiểm tra khi thêm giỏ hàng

```typescript
// my-app/app/product/[id].tsx

// Thêm vào interface Product:
interface Product {
  // ... các field hiện tại
  isStopped?: boolean;
}

// Trong function handleAddToCart hoặc handleBuyNow:
const handleAddToCart = async () => {
  // Kiểm tra sản phẩm có bị dừng bán không
  if (product?.isStopped) {
    Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
    return;
  }
  
  // ... code thêm giỏ hàng hiện tại
};

const handleBuyNow = async () => {
  // Kiểm tra sản phẩm có bị dừng bán không
  if (product?.isStopped) {
    Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
    return;
  }
  
  // ... code mua ngay hiện tại
};
```

## Bước 5: Cập nhật checkout.tsx - Kiểm tra realtime

```typescript
// my-app/app/checkout.tsx

// Thêm function kiểm tra sản phẩm dừng bán
const checkStoppedProducts = async () => {
  try {
    const stoppedProducts = [];
    
    for (const item of cartItems) {
      const res = await fetch(`${BASE_URL}/shoes/${item.productId || item._id}`);
      if (res.ok) {
        const product = await res.json();
        if (product.isStopped) {
          stoppedProducts.push(product.name);
        }
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
      return true; // Có sản phẩm dừng bán
    }
    
    return false; // Không có sản phẩm dừng bán
  } catch (error) {
    console.error('Error checking stopped products:', error);
    return false;
  }
};

// Gọi function này trong useEffect hoặc useFocusEffect:
useFocusEffect(
  React.useCallback(() => {
    checkStoppedProducts();
  }, [cartItems])
);

// Và trước khi thanh toán:
const handleCheckout = async () => {
  const hasStoppedProducts = await checkStoppedProducts();
  if (hasStoppedProducts) {
    return; // Dừng lại nếu có sản phẩm dừng bán
  }
  
  // ... code thanh toán hiện tại
};
```

## Bước 6: Restart backend và test

1. Restart backend server
2. Vào admin → Products → Bấm "Dừng bán" một sản phẩm
3. Vào app mobile → Vào chi tiết sản phẩm đó → Thử thêm giỏ hàng
4. Kết quả: Thông báo "Sản phẩm này đã dừng bán"
5. Nếu đang ở checkout với sản phẩm đó → Tự động thông báo và về home

## Lưu ý:
- Cần restart backend sau khi thêm field `isStopped` vào model
- Có thể cần xóa và tạo lại collection products nếu gặp lỗi
- Kiểm tra kỹ tên field và API endpoints
