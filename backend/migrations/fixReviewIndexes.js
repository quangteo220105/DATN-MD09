const mongoose = require('mongoose');

async function fixReviewIndexes() {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('reviews');

        console.log('🔧 Checking review indexes...');

        // Lấy danh sách indexes hiện tại
        const indexes = await collection.indexes();
        console.log('📋 Current indexes:', indexes.map(idx => idx.name));

        // Tìm index cũ (chỉ có orderId + userId, không có itemIdentifier)
        const oldIndex = indexes.find(idx =>
            idx.name === 'orderId_1_userId_1' &&
            !idx.key.itemIdentifier
        );

        if (oldIndex) {
            console.log('🗑️  Dropping old index: orderId_1_userId_1');
            await collection.dropIndex('orderId_1_userId_1');
            console.log('✅ Old index dropped successfully');
        } else {
            console.log('✅ No old index found, indexes are correct');
        }

        // Đảm bảo index mới tồn tại
        const newIndex = indexes.find(idx =>
            idx.name === 'orderId_1_userId_1_itemIdentifier_1'
        );

        if (!newIndex) {
            console.log('📝 Creating new index with itemIdentifier...');
            await collection.createIndex(
                { orderId: 1, userId: 1, itemIdentifier: 1 },
                { unique: true, sparse: true }
            );
            console.log('✅ New index created successfully');
        }

        console.log('✅ Review indexes fixed successfully');
    } catch (error) {
        console.error('❌ Error fixing review indexes:', error);
        // Không throw error để không làm crash server
    }
}

module.exports = fixReviewIndexes;
