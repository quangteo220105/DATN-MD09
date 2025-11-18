// Script để kiểm tra tất cả sản phẩm và ảnh
async function checkAllProducts() {
    try {
        console.log('🔍 Checking all products and their images...');

        // 1. Lấy danh sách tất cả sản phẩm
        const productsResponse = await fetch('http://localhost:3000/api/products');
        const products = await productsResponse.json();

        console.log(`\n📋 Found ${products.length} products:`);

        for (const product of products) {
            console.log(`\n🏷️ Product: ${product.name}`);
            console.log(`🆔 ID: ${product._id}`);
            console.log(`🏢 Brand: ${product.brand}`);
            console.log(`📦 Variants: ${product.variants.length}`);

            if (product.variants.length > 0) {
                const firstVariant = product.variants[0];
                console.log(`🖼️ First variant image: ${firstVariant.image}`);

                // Test ảnh có load được không
                try {
                    const imageUrl = `http://192.168.1.9:3000${firstVariant.image}`;
                    const imageResponse = await fetch(imageUrl);
                    console.log(`✅ Image status: ${imageResponse.status} - ${imageResponse.status === 200 ? 'OK' : 'ERROR'}`);
                } catch (error) {
                    console.log(`❌ Image error: ${error.message}`);
                }
            } else {
                console.log('❌ No variants found');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkAllProducts();

































































