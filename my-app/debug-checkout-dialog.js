// DEBUG SCRIPT - Kiểm tra logic dialog checkout
// Chạy script này để debug vấn đề dialog

console.log('=== DEBUG CHECKOUT DIALOG LOGIC ===');

// Mô phỏng các trường hợp
const scenarios = [
    {
        name: 'CASE 1: Reset app + Mua ngay bình thường',
        params: { orderId: null, payment: null },
        pendingFlag: null,
        expectedResult: 'Không hiện dialog'
    },
    {
        name: 'CASE 2: Thanh toán lại từ orders.tsx',
        params: { orderId: '12345', payment: null },
        pendingFlag: null,
        expectedResult: 'Tạo pending flag với isRetryPayment: true'
    },
    {
        name: 'CASE 3: ZaloPay thành công từ retry payment',
        params: { orderId: null, payment: 'success' },
        pendingFlag: { orderId: '12345', isRetryPayment: true, timestamp: Date.now() },
        expectedResult: 'Hiện dialog thành công'
    },
    {
        name: 'CASE 4: Mua ngay sau retry payment thành công',
        params: { orderId: null, payment: null },
        pendingFlag: null, // Đã được xóa ở case 3
        expectedResult: 'Không hiện dialog'
    }
];

// Hàm mô phỏng shouldCheckPayment
function shouldCheckPayment(params, pendingFlag) {
    const hasPaymentParam = params.payment === 'success';
    const hasPendingFlag = !!pendingFlag;
    return !!(hasPaymentParam || hasPendingFlag);
}

// Hàm mô phỏng checkPaymentSuccess
function checkPaymentSuccess(params, pendingFlag, orders) {
    console.log('  checkPaymentSuccess called with:', { params, pendingFlag });

    // CASE 1: payment=success param
    if (params.payment === 'success') {
        console.log('  → Payment success param detected');

        // Kiểm tra retry payment trước
        if (pendingFlag && pendingFlag.isRetryPayment) {
            console.log('  → Found retry payment flag, looking for order:', pendingFlag.orderId);
            const targetOrder = orders.find(o => o.id === pendingFlag.orderId);
            if (targetOrder) {
                console.log('  → Found retry order, status:', targetOrder.status);
                return targetOrder.status === 'đã xác nhận' ? 'SUCCESS_DIALOG' : 'FAILED_DIALOG';
            }
        }

        // Tìm đơn mới nhất
        const latestOrder = orders[0]; // Giả sử đã sort
        if (latestOrder && latestOrder.payment === 'zalopay') {
            console.log('  → Found latest order, status:', latestOrder.status);
            return latestOrder.status === 'đã xác nhận' ? 'SUCCESS_DIALOG' : 'FAILED_DIALOG';
        }
    }

    // CASE 2: pending flag
    if (pendingFlag) {
        console.log('  → Pending flag detected');
        const targetOrder = orders.find(o => o.id === pendingFlag.orderId);
        if (targetOrder) {
            console.log('  → Found pending order, status:', targetOrder.status);
            return targetOrder.status === 'đã xác nhận' ? 'SUCCESS_DIALOG' : 'FAILED_DIALOG';
        }
    }

    return 'NO_DIALOG';
}

// Test các scenarios
scenarios.forEach((scenario, index) => {
    console.log(`\n--- ${scenario.name} ---`);

    // Mô phỏng orders (đơn hàng mẫu)
    const orders = [
        { id: '12345', payment: 'zalopay', status: 'đã xác nhận', createdAt: new Date() },
        { id: '67890', payment: 'zalopay', status: 'chờ thanh toán', createdAt: new Date() }
    ];

    const shouldCheck = shouldCheckPayment(scenario.params, scenario.pendingFlag);
    console.log('shouldCheckPayment:', shouldCheck);

    if (shouldCheck) {
        const result = checkPaymentSuccess(scenario.params, scenario.pendingFlag, orders);
        console.log('Result:', result);
    } else {
        console.log('Result: NO_CHECK');
    }

    console.log('Expected:', scenario.expectedResult);
});

console.log('\n=== POTENTIAL ISSUES ===');
console.log('1. Khi reset app, pending flag có thể vẫn còn từ lần trước');
console.log('2. Logic xóa pending flag khi "mua ngay bình thường" có thể không chạy');
console.log('3. Retry payment có thể không tạo pending flag đúng cách');
console.log('4. payment=success param có thể không được truyền đúng từ ZaloPay');

console.log('\n=== DEBUGGING STEPS ===');
console.log('1. Kiểm tra console.log khi vào checkout bình thường');
console.log('2. Kiểm tra pending flag có được xóa không');
console.log('3. Kiểm tra retry payment có tạo flag đúng không');
console.log('4. Kiểm tra payment=success param có được detect không');