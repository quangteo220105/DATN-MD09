# Hướng dẫn thêm kiểm tra sản phẩm dừng bán vào product/[id].tsx

## Vấn đề
Khi admin ấn dừng bán ở Product.jsx, người dùng vẫn có thể thêm giỏ hàng và mua ngay sản phẩm đó.

## Giải pháp

### 1. Cập nhật interface Product
Thêm trường `isActive` vào interface Product:

```typescript
interface Product {
    _id: string;
    name: string;
    brand: string;
    description: string;
    variants: Variant[];
    categoryId?: string;
    isActive?: boolean;  // ✅ THÊM DÒNG NÀY
}
```

### 2. Thêm auto-refresh để kiểm tra trạng thái real-time
Thêm useEffect sau phần load product details:

```typescript
// ✅ Auto-refresh product mỗi 2 giây để kiểm tra trạng thái dừng bán real-time
useEffect(() => {
    if (!id) return;
    
    const interval = setInterval(async () => {
        try {
            const response = await axios.get(`${BASE_URL}/products/${id}`);
            setProduct(response.data);
        } catch (error) {
            console.log('Lỗi refresh sản phẩm:', error);
        }
    }, 2000); // Refresh mỗi 2 giây

    return () => clearInterval(interval);
}, [id]);
```

### 3. Thêm kiểm tra trong hàm addToCart
Tìm hàm `addToCart` và thêm kiểm tra sau phần kiểm tra variant:

```typescript
const addToCart = async () => {
    if (!selectedVariant || !product) {
        Alert.alert('Thông báo', 'Vui lòng chọn màu sắc và kích cỡ');
        return;
    }
    
    // ✅ THÊM KIỂM TRA NÀY
    // Kiểm tra sản phẩm dừng bán
    if (product.isActive === false) {
        Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
        return;
    }
    
    // Kiểm tra stock
    if (selectedVariant.stock === 0) {
        Alert.alert('Thông báo', 'Sản phẩm đã hết hàng');
        return;
    }
    
    // ... phần code còn lại
};
```

### 4. Thêm kiểm tra trong hàm buyNow
Tìm hàm `buyNow` và thêm kiểm tra tương tự:

```typescript
const buyNow = async () => {
    if (!selectedVariant || !product) {
        Alert.alert('Thông báo', 'Vui lòng chọn màu sắc và kích cỡ');
        return;
    }
    
    // ✅ THÊM KIỂM TRA NÀY
    // Kiểm tra sản phẩm dừng bán
    if (product.isActive === false) {
        Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
        return;
    }
    
    // Kiểm tra stock
    if (selectedVariant.stock === 0) {
        Alert.alert('Thông báo', 'Sản phẩm đã hết hàng');
        return;
    }
    
    // ... phần code còn lại
};
```

## Kết quả
Sau khi thêm code trên:
- Khi admin ấn dừng bán, sau tối đa 2 giây sản phẩm sẽ được cập nhật
- Nút "Thêm vào giỏ" và "Mua ngay" sẽ kiểm tra `product.isActive`
- Nếu `isActive === false`, hiển thị thông báo "Sản phẩm này đã dừng bán"
- Người dùng không thể thêm giỏ hàng hoặc mua ngay sản phẩm đã dừng bán
