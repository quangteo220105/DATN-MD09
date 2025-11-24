import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BASE_URL } from '../../config/apiConfig';

interface Review {
    _id: string;
    userId: any;
    productId: string;
    orderId: string;
    rating: number;
    comment: string;
    customerName?: string;
    createdAt: string;
}

export default function ProductReviewsScreen() {
    const { productId } = useLocalSearchParams();
    const router = useRouter();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [productName, setProductName] = useState('');
    const [averageRating, setAverageRating] = useState(0);

    useEffect(() => {
        fetchReviews();
        fetchProductInfo();
    }, [productId]);

    const fetchProductInfo = async () => {
        try {
            const response = await fetch(`${BASE_URL}/products/${productId}`);
            if (response.ok) {
                const data = await response.json();
                setProductName(data.name || 'Sản phẩm');
            }
        } catch (error) {
            console.log('Error fetching product info:', error);
        }
    };

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/reviews/product/${productId}`);
            if (response.ok) {
                const data = await response.json();
                const reviewsList = Array.isArray(data.reviews) ? data.reviews : [];

                // Lấy tên khách hàng từ order address
                const reviewsWithNames = await Promise.all(
                    reviewsList.map(async (review: Review) => {
                        try {
                            // Lấy order ID (có thể là string hoặc object)
                            const orderId = typeof review.orderId === 'object'
                                ? (review.orderId._id || review.orderId)
                                : review.orderId;

                            console.log('Fetching order ID:', orderId);

                            // Lấy thông tin order để lấy địa chỉ
                            const orderResponse = await fetch(`${BASE_URL}/orders/${orderId}`);
                            console.log('Order fetch status:', orderResponse.status);

                            if (orderResponse.ok) {
                                const orderData = await orderResponse.json();
                                console.log('Order data address:', orderData.address);

                                // Parse địa chỉ để lấy tên (format từ checkout: "Tên - Số điện thoại\nĐịa chỉ")
                                if (orderData.address) {
                                    let customerName = 'Khách hàng';

                                    // Thử parse theo format: "Tên - Số điện thoại\nĐịa chỉ"
                                    if (orderData.address.includes('\n')) {
                                        const firstLine = orderData.address.split('\n')[0];
                                        console.log('First line:', firstLine);

                                        if (firstLine.includes('-')) {
                                            customerName = firstLine.split('-')[0]?.trim() || 'Khách hàng';
                                        } else {
                                            // Nếu không có dấu -, lấy toàn bộ dòng đầu
                                            customerName = firstLine.trim() || 'Khách hàng';
                                        }
                                    } else {
                                        // Nếu không có xuống dòng, thử tách bằng dấu -
                                        if (orderData.address.includes('-')) {
                                            customerName = orderData.address.split('-')[0]?.trim() || 'Khách hàng';
                                        } else {
                                            // Fallback: lấy 50 ký tự đầu
                                            customerName = orderData.address.substring(0, 50).trim() || 'Khách hàng';
                                        }
                                    }

                                    console.log('Parsed customer name:', customerName);
                                    return { ...review, customerName };
                                }
                            } else {
                                console.log('Order fetch failed:', orderResponse.status);
                            }
                        } catch (error) {
                            console.log('Error fetching order for review:', error);
                        }
                        return { ...review, customerName: 'Khách hàng' };
                    })
                );

                setReviews(reviewsWithNames);
                setAverageRating(data.averageRating || 0);
            }
        } catch (error) {
            console.log('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={16}
                        color="#f59e0b"
                    />
                ))}
            </View>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const renderReview = ({ item }: { item: Review }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {(item.customerName || 'K').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.reviewHeaderInfo}>
                    <Text style={styles.customerName}>{item.customerName || 'Khách hàng'}</Text>
                    <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
                </View>
            </View>
            <View style={styles.ratingRow}>
                {renderStars(item.rating)}
            </View>
            {item.comment && (
                <Text style={styles.reviewComment}>{item.comment}</Text>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#222" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Đánh giá sản phẩm</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#222" />
                    <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Danh sách đánh giá sản phẩm</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.summarySection}>
                <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
                <View style={styles.summaryRow}>
                    <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
                    <View style={styles.summaryStars}>
                        {renderStars(Math.round(averageRating))}
                    </View>
                    <Text style={styles.totalReviews}>({reviews.length} đánh giá)</Text>
                </View>
            </View>

            <FlatList
                data={reviews}
                keyExtractor={(item) => item._id}
                renderItem={renderReview}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        position: 'relative',
    },
    backButton: {
        padding: 4,
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginLeft: 45,
    },
    summarySection: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    averageRating: {
        fontSize: 32,
        fontWeight: '700',
        color: '#222',
        marginRight: 12,
    },
    summaryStars: {
        flexDirection: 'row',
        marginRight: 8,
    },
    totalReviews: {
        fontSize: 14,
        color: '#666',
    },
    listContainer: {
        padding: 16,
    },
    reviewCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6b7280',
    },
    reviewHeaderInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 2,
    },
    reviewDate: {
        fontSize: 12,
        color: '#888',
    },
    ratingRow: {
        marginBottom: 8,
    },
    starsContainer: {
        flexDirection: 'row',
    },
    reviewComment: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#888',
    },
});
