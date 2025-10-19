async function testAPI() {
    try {
        console.log('🔍 Testing API...');

        // 1. Lấy danh sách sản phẩm
        console.log('\n📋 Getting products list...');
        const productsResponse = await fetch('http://localhost:3000/api/products');
        const products = await productsResponse.json();

        console.log(`✅ Found ${products.length} products`);

        // Tìm Nike Air Max
        const nikeAirMax = products.find(p => p.name.toLowerCase().includes('nike') && p.name.toLowerCase().includes('air'));

        if (nikeAirMax) {
            console.log(`\n🎯 Found Nike Air Max: ${nikeAirMax.name}`);
            console.log(`🆔 Product ID: ${nikeAirMax._id}`);

            // 2. Tạo test data
            console.log('\n🧪 Creating test data...');
            const testDataResponse = await fetch(`http://localhost:3000/api/products/test-data/${nikeAirMax._id}`, {
                method: 'POST'
            });
            const testData = await testDataResponse.json();
            console.log('✅ Test data created:', testData);

            // 3. Lấy chi tiết sản phẩm
            console.log('\n📊 Getting product details...');
            const productDetailsResponse = await fetch(`http://localhost:3000/api/products/${nikeAirMax._id}`);
            const productDetails = await productDetailsResponse.json();

            console.log(`✅ Product: ${productDetails.name}`);
            console.log(`✅ Brand: ${productDetails.brand}`);
            console.log(`✅ Total Variants: ${productDetails.variants.length}`);

            // Group by color
            const colors = [...new Set(productDetails.variants.map(v => v.color))];
            console.log(`✅ Colors: ${colors.join(', ')}`);

            // Group by size
            const sizes = [...new Set(productDetails.variants.map(v => v.size))];
            console.log(`✅ Sizes: ${sizes.join(', ')}`);

            // Show first few variants
            console.log('\n📋 First 5 variants:');
            productDetails.variants.slice(0, 5).forEach((variant, index) => {
                console.log(`${index + 1}. Color: ${variant.color}, Size: ${variant.size}, Price: ${variant.currentPrice.toLocaleString('vi-VN')} VND, Stock: ${variant.stock}`);
            });

        } else {
            console.log('❌ Nike Air Max not found');
            console.log('Available products:');
            products.forEach(p => console.log(`- ${p.name} (ID: ${p._id})`));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();
