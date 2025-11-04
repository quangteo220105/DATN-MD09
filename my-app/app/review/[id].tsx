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
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadOrder = async () => {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) {
                router.replace('/(tabs)/login');
                return;
            }

            // Ưu tiên lấy từ backend để có _id chính xác
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
                console.log('Fetch from backend failed, trying local:', e);
            }

            // Fallback: lấy từ local storage
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

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Thông báo', 'Vui lòng chọn điểm đánh giá');
            return;
        }
        if (!comment.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập đánh giá của bạn');
            return;
        }

        setLoading(true);
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) {
                Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
                return;
            }

            // Lấy orderId từ backend (_id) nếu có, không thì dùng id
            const backendOrderId = order?._id || (String(id).length === 24 ? id : null);
            if (!backendOrderId) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng');
                setLoading(false);
                return;
            }

            // Gửi đánh giá lên server
            const reviewData = {
                orderId: backendOrderId,
                userId: user._id,
                rating: rating,
                comment: comment.trim(),
                items: order?.items || []
            };

            try {
                const res = await fetch(`${BASE_URL}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reviewData)
                });

                const responseData = await res.json();

                if (res.ok) {
                    // Lưu local để đảm bảo (với cả id và _id)
                    const reviewDataWithTime = {
                        ...reviewData,
                        createdAt: new Date().toISOString()
                    };
                    const reviewKey1 = `review_${user._id}_${id}`;
                    await AsyncStorage.setItem(reviewKey1, JSON.stringify(reviewDataWithTime));

                    if (backendOrderId !== id) {
                        const reviewKey2 = `review_${user._id}_${backendOrderId}`;
                        await AsyncStorage.setItem(reviewKey2, JSON.stringify(reviewDataWithTime));
                    }

                    Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!', [
                        { text: 'OK', onPress: () => router.back() }
                    ]);
                } else {
                    // Nếu lỗi từ API, hiển thị thông báo lỗi
                    const errorMsg = responseData?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.';
                    Alert.alert('Lỗi', errorMsg);
                }
            } catch (error) {
                console.error('Error submitting review:', error);
                Alert.alert('Lỗi', 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối và thử lại.');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            Alert.alert('Lỗi', 'Không thể gửi đánh giá. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đánh giá đơn hàng</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                {order && (
                    <>
                        <View style={styles.orderInfo}>
                            <Text style={styles.orderLabel}>Mã đơn hàng:</Text>
                            <Text style={styles.orderValue}>{String(order.id || order._id)}</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>

                            {/* Rating Stars */}
                            <View style={styles.ratingContainer}>
                                <Text style={styles.ratingLabel}>Điểm đánh giá: {rating > 0 ? `${rating}/5` : '(Chưa chọn)'}</Text>
                                <View style={styles.starsContainer}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <TouchableOpacity
                                            key={star}
                                            onPress={() => setRating(star)}
                                            style={styles.starBtn}
                                        >
                                            <Ionicons
                                                name={star <= rating ? "star" : "star-outline"}
                                                size={36}
                                                color={star <= rating ? "#f59e0b" : "#ddd"}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {rating > 0 && (
                                    <Text style={styles.ratingText}>{rating}/5</Text>
                                )}
                            </View>

                            {/* Comment Input */}
                            <View style={styles.commentContainer}>
                                <Text style={styles.commentLabel}>Nhận xét của bạn:</Text>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Chia sẻ cảm nhận của bạn về đơn hàng..."
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={6}
                                    value={comment}
                                    onChangeText={setComment}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        {/* Products in order */}
                        {Array.isArray(order.items) && order.items.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Sản phẩm đã mua</Text>
                                {order.items.map((item: any, index: number) => (
                                    <View key={index} style={styles.productItem}>
                                        <Text style={styles.productName}>
                                            {item.name} ({item.size}, {item.color}) x{item.qty}
                                        </Text>
                                    </View>
                                ))}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
    },
    container: {
        padding: 16,
    },
    orderInfo: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderLabel: {
        fontSize: 14,
        color: '#666',
    },
    orderValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 16,
    },
    ratingContainer: {
        marginBottom: 20,
    },
    ratingLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    starBtn: {
        marginRight: 8,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f59e0b',
        marginTop: 8,
    },
    commentContainer: {
        marginTop: 10,
    },
    commentLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    commentInput: {
        backgroundColor: '#f8f8f9',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#222',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 120,
    },
    productItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    productName: {
        fontSize: 14,
        color: '#333',
    },
    submitBtn: {
        backgroundColor: '#f59e0b',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

