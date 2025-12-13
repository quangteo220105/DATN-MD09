// Test script để kiểm tra OpenAI API key
const OpenAI = require('openai');

// Lấy key từ environment
const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

console.log('=== OpenAI Key Test ===');
console.log('Key exists:', !!apiKey);
console.log('Key length:', apiKey ? apiKey.length : 0);
console.log('Key starts with:', apiKey ? apiKey.substring(0, 10) : 'N/A');
console.log('Key ends with:', apiKey ? apiKey.substring(apiKey.length - 10) : 'N/A');

// Test API call
async function testOpenAI() {
    if (!apiKey) {
        console.error('❌ API key not found in environment');
        return;
    }

    try {
        const openai = new OpenAI({
            apiKey: apiKey.trim(), // Trim để loại bỏ khoảng trắng
            dangerouslyAllowBrowser: true
        });

        console.log('\n🔄 Testing OpenAI API...');

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: 'Say "Hello"' }
            ],
            max_tokens: 10
        });

        console.log('✅ OpenAI API works!');
        console.log('Response:', completion.choices[0]?.message?.content);
    } catch (error) {
        console.error('❌ OpenAI API error:', error.message);
        console.error('Status:', error.status);
        console.error('Type:', error.type);
    }
}

testOpenAI();
