// Test script để kiểm tra ảnh
const testImages = [
    'http://192.168.1.9:3000/images/nike-air-max.webp',
    'http://192.168.1.9:3000/images/nike2.webp',
    'http://192.168.1.9:3000/images/1760555812506.webp'
];

console.log('🧪 Testing image URLs:');
testImages.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
});

// Test với fetch
async function testImageAccess() {
    for (const url of testImages) {
        try {
            const response = await fetch(url);
            console.log(`✅ ${url} - Status: ${response.status}`);
        } catch (error) {
            console.log(`❌ ${url} - Error: ${error.message}`);
        }
    }
}

testImageAccess();



