// Script test API dừng bán sản phẩm
// Chạy: node test-stop-selling-api.js

const productId = '69209170590eb33a2d003c10'; // Brooks Ghost ID từ log
const BASE_URL = 'http://localhost:3000/api';

async function testToggleStop() {
    console.log('='.repeat(60));
    console.log('TEST: Toggle Stop Selling API');
    console.log('='.repeat(60));

    // 1. Lấy thông tin sản phẩm trước khi toggle
    console.log('\n1️⃣ Lấy thông tin sản phẩm TRƯỚC khi toggle...');
    try {
        const response1 = await fetch(`${BASE_URL}/products/${productId}`);
        const product1 = await response1.json();
        console.log('   Product:', product1.name);
        console.log('   isActive TRƯỚC:', product1.isActive);
        console.log('   ✅ GET /products/:id hoạt động');
    } catch (error) {
        console.log('   ❌ Lỗi GET:', error.message);
        return;
    }

    // 2. Gọi API toggle-stop
    console.log('\n2️⃣ Gọi API toggle-stop...');
    try {
        const response2 = await fetch(`${BASE_URL}/products/${productId}/toggle-stop`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response2.ok) {
            console.log('   ❌ API trả về lỗi:', response2.status);
            const error = await response2.json();
            console.log('   Error:', error);
            return;
        }

        const result = await response2.json();
        console.log('   ✅ API toggle-stop hoạt động');
        console.log('   Response:', result);
    } catch (error) {
        console.log('   ❌ Lỗi PUT:', error.message);
        return;
    }

    // 3. Lấy thông tin sản phẩm sau khi toggle
    console.log('\n3️⃣ Lấy thông tin sản phẩm SAU khi toggle...');
    try {
        const response3 = await fetch(`${BASE_URL}/products/${productId}`);
        const product3 = await response3.json();
        console.log('   Product:', product3.name);
        console.log('   isActive SAU:', product3.isActive);

        if (product3.isActive === false) {
            console.log('   ✅ Sản phẩm đã được dừng bán thành công!');
        } else {
            console.log('   ⚠️ Sản phẩm vẫn đang active');
        }
    } catch (error) {
        console.log('   ❌ Lỗi GET:', error.message);
        return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('KẾT LUẬN:');
    console.log('- Nếu thấy "✅ Sản phẩm đã được dừng bán thành công!"');
    console.log('  → API backend hoạt động đúng');
    console.log('  → Vấn đề nằm ở frontend (admin hoặc mobile)');
    console.log('\n- Nếu thấy "⚠️ Sản phẩm vẫn đang active"');
    console.log('  → API backend KHÔNG hoạt động');
    console.log('  → Cần kiểm tra lại route hoặc database');
    console.log('='.repeat(60));
}

// Chạy test
testToggleStop().catch(console.error);
