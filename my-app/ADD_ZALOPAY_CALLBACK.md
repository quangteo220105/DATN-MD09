# Thêm ZaloPay Callback Route vào Backend

## Vấn đề phát hiện:

Từ logs:
```
LOG  [Checkout] Checking backend for payment success...
```

App đang kiểm tra backend nhưng **KHÔNG TÌM THẤY** đơn hàng có trạng thái "Đã xác nhận" vì:
- ❌ Backend chưa có route `/api/orders/zalopay/callback`
- ❌ zalopay-sandbox.html gọi callback nhưng backend không xử lý
- ❌ Trạng thái đơn hàng không được cập nhật từ "Chờ thanh toán" → "Đã xác nhận"

## Giải pháp:

### Bước 1: Thêm Callback Route vào backend/routes/orderRoutes.js

Mở file `backend/routes/orderRoutes.js` và THÊM route callback:

```javascript
// ✅ THÊM ROUTE CALLBACK CHO ZALOPAY
router.post('/zalopay/callback', async (req, res) => {
    try {
        const { appid, apptransid, status, amount } = req.body;
        
        console.log('📱 ZaloPay callback received:', {
            appid,
            apptransid,
            status,
            amount,
            fullBody: req.body
        });
        
        if (status === 1) { // Thanh toán thành công
            // Tìm orderId từ apptransid (format: timestamp_orderId)
            const parts = apptransid.split('_');
            const orderId = parts.length > 1 ? parts[1] : null;
            
            console.log('🔍 Extracted orderId:', orderId);
            
            if (orderId) {
                // Cập nhật trạng thái đơn hàng
                const order = await Order.findById(orderId);
                
                if (order) {
                    console.log('📦 Found order:', {
                        id: order._id,
                        currentStatus: order.status,
                        payment: order.payment
                    });
                    
                    order.status = 'Đã xác nhận';
                    order.paymentStatus = 'paid';
                    order.paidAt = new Date();
                    await order.save();
                    
                    console.log('✅ Order updated successfully:', {
                        id: orderId,
                        newStatus: order.status
                    });
                    
                    return res.json({ 
                        return_code: 1, 
                        return_message: 'success',
                        orderId: orderId,
                        paymentSuccess: true 
                    });
                } else {
                    console.log('❌ Order not found:', orderId);
                    return res.json({ 
                        return_code: 0, 
                        return_message: 'Order not found' 
                    });
                }
            } else {
                console.log('❌ Could not extract orderId from apptransid:', apptransid);
                return res.json({ 
                    return_code: 0, 
                    return_message: 'Invalid apptransid' 
                });
            }
        } else {
            console.log('❌ Payment failed, status:', status);
            return res.json({ 
                return_code: 0, 
                return_message: 'Payment failed' 
            });
        }
    } catch (error) {
        console.error('❌ ZaloPay callback error:', error);
        return res.json({ 
            return_code: 0, 
            return_message: 'error',
            error: error.message 
        });
    }
});
```

### Bước 2: Kiểm tra Order model có các field cần thiết

Mở file `backend/model/Order.js` và đảm bảo có:

```javascript
const orderSchema = new mongoose.Schema({
    // ... các field hiện có ...
    
    status: { 
        type: String, 
        default: 'Chờ xác nhận',
        enum: ['Chờ xác nhận', 'Chờ thanh toán', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy']
    },
    
    // ✅ THÊM NẾU CHƯA CÓ
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    
    paidAt: {
        type: Date
    },
    
    // ... các field khác ...
});
```

### Bước 3: Cập nhật zalopay-sandbox.html để gọi callback đúng

Trong file `backend/public/zalopay-sandbox.html`, tìm hàm `handlePayment` và cập nhật:

```javascript
async function handlePayment(status) {
    // ... code hiện tại ...

    if (status === 'success') {
        // Hiển thị loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.add('active');
        
        message = '✅ Thanh toán thành công! Đang gửi callback...';
        statusClass = 'status-success';
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + statusClass;

        // ✅ GỬI CALLBACK VỀ SERVER
        try {
            const callbackData = {
                appid: appid,
                apptransid: apptransid,
                pmcid: 'zalopay',
                status: 1, // 1 = thành công
                amount: amountNum,
                description: description,
                timestamp: Date.now(),
                mac: generateMAC(appid, apptransid, amountNum, status)
            };

            console.log('📤 Sending callback to server:', callbackData);

            // ✅ ĐÚNG URL CALLBACK
            const response = await fetch('/api/orders/zalopay/callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(callbackData)
            });

            const result = await response.json();
            console.log('📥 Callback response:', result);

            if (response.ok && result.return_code === 1) {
                // Cập nhật loading text
                const loadingText = loadingOverlay.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = 'Thanh toán thành công!';
                }

                // Đợi 1.5 giây
                setTimeout(() => {
                    loadingOverlay.classList.remove('active');
                    
                    // Hiển thị thông báo thành công
                    message = '✅ Thanh toán thành công! Đơn hàng đã được cập nhật.';
                    statusMessage.textContent = message;
                    statusMessage.className = 'status-message ' + statusClass;
                    statusMessage.style.display = 'block';
                    
                    // Hiển thị hướng dẫn
                    const instructionDiv = document.createElement('div');
                    instructionDiv.style.marginTop = '20px';
                    instructionDiv.style.padding = '16px';
                    instructionDiv.style.backgroundColor = '#f0fdf4';
                    instructionDiv.style.borderRadius = '12px';
                    instructionDiv.style.border = '2px solid #22c55e';
                    instructionDiv.style.fontSize = '14px';
                    instructionDiv.style.color = '#166534';
                    instructionDiv.style.lineHeight = '1.6';
                    instructionDiv.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 12px; font-size: 16px;">🎉 Đơn hàng đã được đặt thành công!</div>
                        <div style="margin-bottom: 8px;">📱 <strong>Vui lòng quay lại app:</strong></div>
                        <div style="margin-left: 20px; margin-bottom: 4px;">1. Nhấn nút <strong>Back</strong> trên điện thoại</div>
                        <div style="margin-left: 20px; margin-bottom: 4px;">2. App sẽ <strong>tự động</strong> hiển thị thông báo thành công</div>
                        <div style="padding-top: 12px; border-top: 1px solid #86efac; font-size: 13px; color: #15803d;">
                            💡 <em>Lưu ý: Đơn hàng đã được cập nhật trên server!</em>
                        </div>
                    `;
                    
                    const oldInstruction = document.querySelector('.payment-instruction');
                    if (oldInstruction) {
                        oldInstruction.remove();
                    }
                    
                    instructionDiv.className = 'payment-instruction';
                    statusMessage.parentNode.insertBefore(instructionDiv, statusMessage.nextSibling);
                    
                    // Ẩn các nút thanh toán
                    const actionButtons = document.querySelector('.actions');
                    if (actionButtons) {
                        actionButtons.style.display = 'none';
                    }
                }, 1500);
            } else {
                loadingOverlay.classList.remove('active');
                message = '⚠️ Thanh toán thành công nhưng callback thất bại: ' + (result.return_message || 'Unknown error');
                statusMessage.textContent = message;
                statusMessage.className = 'status-message status-failure';
                console.error('❌ Callback failed:', result);
            }
        } catch (error) {
            console.error('❌ Callback error:', error);
            loadingOverlay.classList.remove('active');
            message = '⚠️ Thanh toán thành công nhưng không thể gửi callback: ' + error.message;
            statusMessage.textContent = message;
            statusMessage.className = 'status-message status-failure';
        }
    }
    // ... code cho failure và processing
}
```

### Bước 4: Test lại

1. **Restart backend server:**
```bash
cd backend
npm start
```

2. **Kiểm tra route có hoạt động:**
```bash
curl -X POST http://localhost:3000/api/orders/zalopay/callback \
  -H "Content-Type: application/json" \
  -d '{"appid":"2554","apptransid":"123_testorder","status":1,"amount":100000}'
```

3. **Test thanh toán:**
   - Thanh toán trên zalopay-sandbox.html
   - Nhấn "Thanh toán thành công"
   - Xem console backend có log không
   - Back về app
   - Dialog sẽ hiển thị!

### Bước 5: Kiểm tra logs

**Backend logs cần thấy:**
```
📱 ZaloPay callback received: { appid: '2554', apptransid: '...', status: 1, ... }
🔍 Extracted orderId: 691a6f7471b6e9125d0c9532
📦 Found order: { id: '691a6f7471b6e9125d0c9532', currentStatus: 'Chờ thanh toán', ... }
✅ Order updated successfully: { id: '691a6f7471b6e9125d0c9532', newStatus: 'Đã xác nhận' }
```

**App logs cần thấy:**
```
[Checkout] Checking backend for payment success...
[Checkout] Payment success detected from backend order status
🎉 handlePaymentSuccess called!
🎉 Setting showSuccessDialog to true
```

## Tóm tắt:

1. ✅ Thêm route `/api/orders/zalopay/callback` vào backend
2. ✅ Cập nhật zalopay-sandbox.html để gọi callback đúng
3. ✅ Restart backend server
4. ✅ Test lại flow thanh toán

Sau khi hoàn thành, khi bạn thanh toán thành công và back về, dialog sẽ hiển thị ngay!
