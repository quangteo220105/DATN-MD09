# Fix 3 vấn đề về Review System

## Vấn đề 1: review/[id].tsx - Thông báo không chính xác

### Nguyên nhân:
Logic đếm số reviews thành công quá phức tạp với retry

### Giải pháp:
Đơn giản hóa - chỉ đếm số reviews được tạo thành công

### Code thay thế (trong handleSubmit):

```typescript
const handleSubmit = async () => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
        Alert.alert('Thông báo', 'Không có sản phẩm để đánh giá');
        return;
    }

    // Kiểm tra tất cả sản phẩm đã được đánh giá
    const items = order.items;
    const missingRatings: string[] = [];

    items.forEach((item: any, index: number) => {
        const itemKey = `${item.productId || item._id || index}_${item.color}_${item.size}`;
        const productReview = productRatings[itemKey];
        if (!productReview || !productReview.rating || productReview.rating === 0) {
            missingRatings.push(item.name || `Sản phẩm ${index + 1}`);
        }
    });

    if (missingRatings.length > 0) {
        Alert.alert('Thông báo', `Vui lòng chọn điểm đánh giá cho:\n${missingRatings.join('\n')}`);
        return;
    }

    setLoading(true);
    try {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) {
            Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
            setLoading(false);
            return;
        }

        const backendOrderId = order?._id || (String(id).length === 24 ? id : null);
        if (!backendOrderId) {
            Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng');
            setLoading(false);
            return;
        }

        let successCount = 0;
        let alreadyReviewedCount = 0;
        const errors: string[] = [];

        // Submit từng review tuần tự
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            const itemKey = `${item.productId || item._id || index}_${item.color}_${item.size}`;
            const productReview = productRatings[itemKey];

            if (!productReview || !productReview.rating) {
                continue;
            }

            const productId = item.productId || item._id;
            if (!productId) {
                errors.push(item.name);
                continue;
            }

            try {
                const res = await fetch(`${BASE_URL}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: backendOrderId,
                        userId: user._id,
                        productId: productId,
                        rating: productReview.rating,
                        comment: productReview.comment || '',
                        items: [item]
                    })
                });

                if (res.ok) {
                    successCount++;
                    console.log(`✅ Review ${successCount} created for ${item.name}`);
                } else {
                    const data = await res.json();
                    if (data.message?.includes('đã đánh giá')) {
                        alreadyReviewedCount++;
                        console.log(`⏭️ Already reviewed: ${item.name}`);
                    } else {
                        errors.push(item.name);
                        console.log(`❌ Error for ${item.name}: ${data.message}`);
                    }
                }
            } catch (e: any) {
                errors.push(item.name);
                console.log(`❌ Exception for ${item.name}:`, e);
            }

            // Delay 500ms giữa các request
            if (index < items.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        setLoading(false);

        // Hiển thị kết quả
        if (successCount > 0) {
            const msg = successCount === items.length
                ? `Đã đánh giá thành công ${successCount} sản phẩm!`
                : `Đã đánh giá thành công ${successCount} sản phẩm${alreadyReviewedCount > 0 ? `. ${alreadyReviewedCount} sản phẩm đã được đánh giá trước đó` : ''}.`;
            
            Alert.alert('Thành công', msg, [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } else if (alreadyReviewedCount > 0) {
            Alert.alert('Thông báo', `Tất cả ${alreadyReviewedCount} sản phẩm đã được đánh giá rồi.`, [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } else {
            Alert.alert('Lỗi', `Không thể đánh giá: ${errors.join(', ')}`);
        }
    } catch (error) {
        setLoading(false);
        console.error('Error submitting reviews:', error);
        Alert.alert('Lỗi', 'Không thể gửi đánh giá. Vui lòng thử lại.');
    }
};
```

## Vấn đề 2: Reviews.jsx - Không hiển thị đủ reviews

### Nguyên nhân:
Backend có thể chỉ trả về 1 review hoặc frontend không xử lý đúng

### Kiểm tra:
1. Mở browser console trong Reviews.jsx
2. Xem log: "✅ Total reviews found: X"
3. Nếu X < 2, vấn đề ở backend
4. Nếu X = 2 nhưng không hiển thị, vấn đề ở frontend

### Giải pháp Backend:
Backend route GET /reviews/order/:orderId đã có log, kiểm tra console

### Giải pháp Frontend:
Code Reviews.jsx đã được fix với log chi tiết. Nếu vẫn không hiển thị, kiểm tra:
- Browser console log
- Backend console log
- MongoDB database: `db.reviews.find({ orderId: ObjectId('YOUR_ORDER_ID') })`

## Vấn đề 3: order/[id].tsx - Cho phép đánh giá lại

### Nguyên nhân:
Logic checkReviewExists() không so sánh chính xác color/size

### Giải pháp:
Sửa lại function checkReviewExists() trong order/[id].tsx:

```typescript
const checkReviewExists = async () => {
    try {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id || !order || !Array.isArray(order.items)) return false;
        
        const backendId = order?._id || (String(id).length === 24 ? id : null);
        const checkId = backendId || id;
        
        // Fetch reviews từ API
        try {
            const res = await fetch(`${BASE_URL}/reviews/order/${checkId}`);
            if (res.ok) {
                const data = await res.json();
                const reviewsList = Array.isArray(data) ? data : [];
                
                // Lọc reviews của user hiện tại
                const userReviews = reviewsList.filter((r: any) => {
                    const reviewUserId = (typeof r.userId === 'object' && r.userId?._id) ? r.userId._id : (r.userId || null);
                    return String(reviewUserId) === String(user._id);
                });
                
                console.log(`🔍 Found ${userReviews.length} reviews by current user`);
                
                // Kiểm tra từng sản phẩm trong order
                let reviewedCount = 0;
                for (const item of order.items) {
                    const productId = item.productId || item._id;
                    if (!productId) continue;
                    
                    const itemColor = String(item.color || '').trim();
                    const itemSize = String(item.size || '').trim();
                    
                    // Tìm review cho sản phẩm này
                    const hasReview = userReviews.some((rev: any) => {
                        if (!rev.productId) return false;
                        
                        const revProductId = rev.productId._id || rev.productId;
                        if (!compareIds(revProductId, productId)) return false;
                        
                        // Kiểm tra color và size
                        if (rev.items && rev.items.length > 0) {
                            const revItem = rev.items[0];
                            const revColor = String(revItem.color || '').trim();
                            const revSize = String(revItem.size || '').trim();
                            return revColor === itemColor && revSize === itemSize;
                        }
                        
                        return !itemColor && !itemSize;
                    });
                    
                    if (hasReview) {
                        reviewedCount++;
                    }
                }
                
                console.log(`🔍 ${reviewedCount}/${order.items.length} items have been reviewed`);
                
                // Nếu tất cả sản phẩm đã có review, return true
                return reviewedCount === order.items.length;
            }
        } catch (e) {
            console.log('API check failed:', e);
        }
        
        return false;
    } catch {
        return false;
    }
};
```

## Tóm tắt:
1. **review/[id].tsx**: Đơn giản hóa logic, đếm chính xác số reviews thành công
2. **Reviews.jsx**: Đã có log chi tiết, kiểm tra backend console
3. **order/[id].tsx**: Sửa checkReviewExists() để so sánh chính xác color/size

## Test:
1. Xóa tất cả reviews cũ: `db.reviews.deleteMany({})`
2. Tạo đơn hàng mới với 2 sản phẩm khác nhau (khác color/size)
3. Đánh giá 2 sản phẩm
4. Kiểm tra:
   - Thông báo: "Đã đánh giá thành công 2 sản phẩm!"
   - Admin Reviews.jsx: Hiển thị 2 reviews
   - order/[id].tsx: Không cho phép đánh giá lại
