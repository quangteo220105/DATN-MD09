// Script để cập nhật ảnh cho sản phẩm Adidas
async function updateAdidasImages() {
    try {
        console.log('🔍 Updating Adidas product images...');

        // 1. Tìm sản phẩm Adidas
        const productsResponse = await fetch('http://localhost:3000/api/products');
        const products = await productsResponse.json();

        const adidasProduct = products.find(p => p.brand.toLowerCase().includes('adidas'));

        if (!adidasProduct) {
            console.log('❌ Adidas product not found');
            return;
        }

        console.log(`✅ Found Adidas product: ${adidasProduct.name} (ID: ${adidasProduct._id})`);

        // 2. Cập nhật variants với ảnh Adidas
        const adidasImages = [
            '/images/adidas1.webp',
            '/images/adidas2.webp'
        ];

        // Tạo test variants cho Adidas
        const colors = ['Đen', 'Trắng', 'Xanh'];
        const sizes = ['40', '41', '42', '43', '44'];
        const testVariants = [];

        colors.forEach((color, colorIndex) => {
            sizes.forEach((size, sizeIndex) => {
                testVariants.push({
                    productId: adidasProduct._id,
                    color: color,
                    size: size,
                    originalPrice: 2800000,
                    currentPrice: 2390000,
                    stock: Math.floor(Math.random() * 10) + 1,
                    image: adidasImages[colorIndex % adidasImages.length],
                    status: 'Còn hàng'
                });
            });
        });

        // 3. Gọi API để tạo test data
        const testDataResponse = await fetch(`http://localhost:3000/api/products/test-data/${adidasProduct._id}`, {
            method: 'POST'
        });

        if (testDataResponse.ok) {
            const result = await testDataResponse.json();
            console.log('✅ Adidas test data created:', result);
        } else {
            console.log('❌ Failed to create Adidas test data');
        }

        // 4. Kiểm tra kết quả
        const productDetailsResponse = await fetch(`http://localhost:3000/api/products/${adidasProduct._id}`);
        const productDetails = await productDetailsResponse.json();

        console.log(`\n📊 Updated Adidas product:`);
        console.log(`✅ Product: ${productDetails.name}`);
        console.log(`✅ Brand: ${productDetails.brand}`);
        console.log(`✅ Total Variants: ${productDetails.variants.length}`);

        // Group by color
        const availableColors = [...new Set(productDetails.variants.map(v => v.color))];
        console.log(`✅ Colors: ${availableColors.join(', ')}`);

        // Group by size
        const availableSizes = [...new Set(productDetails.variants.map(v => v.size))];
        console.log(`✅ Sizes: ${availableSizes.join(', ')}`);

        // Show first few variants
        console.log('\n📋 First 5 variants:');
        productDetails.variants.slice(0, 5).forEach((variant, index) => {
            console.log(`${index + 1}. Color: ${variant.color}, Size: ${variant.size}, Image: ${variant.image}, Price: ${variant.currentPrice.toLocaleString('vi-VN')} VND, Stock: ${variant.stock}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

updateAdidasImages();
