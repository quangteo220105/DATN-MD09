import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../config/apiConfig';

export default function ReviewScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [order, setOrder] = useState<any | null>(null);
    const [productRatings, setProductRatings] = useState<{ [key: string]: { rating: number; comment: string } }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadOrder = async () => {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) {
                router.replace('/(tabs)/login');
                return;
            }

            try {
                const res = await fetch(`${BASE_URL}/orders/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && (data._id || data.id)) {
                        setOrder(data);
                        return;
                    }
                }
            } catch (e) {
                console.log('Fetch from backend failed:', e);
            }

            const historyKey = `order_history_${user._id}`;
            const historyString = await AsyncStorage.getItem(historyKey);
            let history = historyString ? JSON.parse(historyString) : [];
            history = Array.isArray(history) ? history : [];
            const found = history.find((o: any) => String(o.id || o._id) === String(id));
            if (found) {
                setOrder(found);
            }
        };
        if (id) loadOrder();
    }, [id, router]);

    const handleProductRatingChange = (itemKey: string, rating: number) => {
        setProductRatings(prev => ({
            ...prev,
            [itemKey]: { ...prev[itemKey], rating }
        }));
    };

    const handleProductCommentChange = (itemKey: string, comment: string) => {
        setProductRatings(prev => ({
            ...prev,
            [itemKey]: { ...prev[itemKey], comment }
        }));
    };

    const handleSubmit = async () => {
        if (!order || !Array.isArray(order.items) || order.items.length === 0) {
            Alert.alert('Thông báo', 'Không có sản phẩm để đánh giá');
            return;
        }

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
            const errors: string[] = [];
            const totalItems = items.length;

            for (let index = 0; index < items.length; index++) {
                const item = items[index];
                const itemKey = `${item.productId || item._id || index}_${item.color}_${item.size}`;
                const productReview = productRatings[itemKey];

                if (!productReview || !productReview.rating) continue;

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

                    const data = await res.json();

                    if (res.ok) {
                        successCount++;
                        console.log(`✅ Review ${successCount}/${totalItems} created for ${item.name}`);
                    } else if (data.message?.includes('đã đánh giá')) {
                        // Nếu gặp lỗi "đã đánh giá", có 2 khả năng:
                        // 1. Review vừa được tạo ở request trước (race condition)
                        // 2. Review đã tồn tại từ trước
                        // Trong cả 2 trường hợp, đều đếm vào successCount vì mục tiêu là tạo review
                        successCount++;
                        console.log(`✅ Review ${successCount}/${totalItems} already exists for ${item.name} (counting as success)`);
                    } else {
                        errors.push(item.name);
                        console.log(`❌ Error for ${item.name}: ${data.message}`);
                    }
                } catch (e: any) {
                    errors.push(item.name);
                    console.log(`❌ Exception for ${item.name}:`, e);
                }

                // Delay giữa các request
                if (index < items.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            setLoading(false);

            // Hiển thị kết quả
            if (successCount === totalItems) {
                Alert.alert('Thành công', `Đã đánh giá thành công ${successCount} sản phẩm!`, [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else if (successCount > 0) {
                const msg = errors.length > 0
                    ? `Đã đánh giá thành công ${successCount}/${totalItems} sản phẩm. ${errors.length} sản phẩm gặp lỗi.`
                    : `Đã đánh giá thành công ${successCount} sản phẩm!`;
                Alert.alert('Thành công', msg, [
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
            <ScrollView contentContainerStyle={styles.container}>
                {order && (
                    <>
                        <View style={styles.orderInfo}>
                            <Text style={styles.orderLabel}>Mã đơn hàng:</Text>
                            <Text style={styles.orderValue}>{String(order.id || order._id)}</Text>
                        </View>

                        {Array.isArray(order.items) && order.items.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Đánh giá sản phẩm</Text>
                                {order.items.map((item: any, index: number) => {
                                    const itemKey = `${item.productId || item._id || index}_${item.color}_${item.size}`;
                                    const productReview = productRatings[itemKey] || { rating: 0, comment: '' };

                                    return (
                                        <View key={index} style={styles.productReviewCard}>
                                            <Text style={styles.productName}>
                                                {item.name} ({item.size}, {item.color}) x{item.qty}
                                            </Text>

                                            <View style={styles.ratingContainer}>
                                                <Text style={styles.ratingLabel}>
                                                    Điểm đánh giá: {productReview.rating > 0 ? `${productReview.rating}/5` : '(Chưa chọn)'}
                                                </Text>
                                                <View style={styles.starsContainer}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <TouchableOpacity
                                                            key={star}
                                                            onPress={() => handleProductRatingChange(itemKey, star)}
                                                            style={styles.starBtn}
                                                        >
                                                            <Ionicons
                                                                name={star <= productReview.rating ? "star" : "star-outline"}
                                                                size={32}
                                                                color={star <= productReview.rating ? "#f59e0b" : "#ddd"}
                                                            />
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>

                                            <View style={styles.commentContainer}>
                                                <Text style={styles.commentLabel}>Nhận xét của bạn:</Text>
                                                <TextInput
                                                    style={styles.commentInput}
                                                    placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
                                                    placeholderTextColor="#999"
                                                    multiline
                                                    numberOfLines={4}
                                                    value={productReview.comment}
                                                    onChangeText={(text) => handleProductCommentChange(itemKey, text)}
                                                    textAlignVertical="top"
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </>
                )}

                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.submitBtnText}>
                        {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    orderInfo: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderLabel: { fontSize: 14, color: '#666' },
    orderValue: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    section: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 16 },
    productReviewCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    productName: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 12 },
    ratingContainer: { marginBottom: 20 },
    ratingLabel: { fontSize: 14, color: '#666', marginBottom: 10 },
    starsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    starBtn: { marginRight: 8 },
    commentContainer: { marginTop: 10 },
    commentLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
    commentInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#222',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 80,
    },
    submitBtn: {
        backgroundColor: '#f59e0b',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
