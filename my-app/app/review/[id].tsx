import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../config/apiConfig';

// Hàm parse địa chỉ để lấy tên và số điện thoại
function parseAddressInfo(address: any, fallbackName = 'Khách hàng', fallbackPhone = '-') {
    if (!address) return { name: fallbackName, phone: fallbackPhone };

    // Nếu address là object
    if (typeof address === 'object') {
        return {
            name: address.name || fallbackName,
            phone: address.phone || fallbackPhone,
        };
    }

    const text = String(address);

    // Thử parse JSON nếu address là JSON string
    if (text.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') {
                return {
                    name: parsed.name || fallbackName,
                    phone: parsed.phone || fallbackPhone,
                };
            }
        } catch (err) {
            // ignore parse error
        }
    }

    let name = fallbackName;
    let phone = fallbackPhone;
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const firstLine = lines[0] || '';

    // Pattern: "Tên - Số điện thoại"
    const dashSplit = firstLine.split(/\s*-\s*/);
    if (dashSplit.length >= 2) {
        name = dashSplit[0].trim() || name;
        phone = dashSplit.slice(1).join(' - ').trim() || phone;
    }

    // Extract phone number using regex (Vietnamese formats)
    const phoneMatch = text.match(/(\+?84|0)(\d[\s\.\-]?){8,10}/);
    if (phoneMatch) {
        phone = phoneMatch[0].replace(/[\s\.\-]/g, '');
        if (phone.startsWith('84') && phone.length >= 11) {
            phone = '0' + phone.slice(2);
        }
    }

    if ((!name || name === fallbackName) && dashSplit.length === 1 && lines.length > 1) {
        name = firstLine || name;
    }

    return { name: name || fallbackName, phone: phone || fallbackPhone };
}

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

    const handleProductRatingChange = (itemKey: string, rating: number) => {
        setProductRatings(prev => ({
            ...prev,
            [itemKey]: {
                ...prev[itemKey],
                rating
            }
        }));
    };

    const handleProductCommentChange = (itemKey: string, comment: string) => {
        setProductRatings(prev => ({
            ...prev,
            [itemKey]: {
                ...prev[itemKey],
                comment
            }
        }));
    };

    // Helper function để so sánh ID chính xác
    const compareIds = (id1: any, id2: any): boolean => {
        if (!id1 || !id2) return false;
        const str1 = String(id1._id || id1);
        const str2 = String(id2._id || id2);
        return str1 === str2;
    };

    const handleSubmit = async () => {
        if (!order || !Array.isArray(order.items) || order.items.length === 0) {
            Alert.alert('Thông báo', 'Không có sản phẩm để đánh giá');
            return;
        }

        // Kiểm tra tất cả sản phẩm đã được đánh giá
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

            // Lấy orderId từ backend (_id) nếu có, không thì dùng id
            const backendOrderId = order?._id || (String(id).length === 24 ? id : null);
            if (!backendOrderId) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng');
                setLoading(false);
                return;
            }

            // Fetch existing reviews một lần ở đầu để tránh fetch nhiều lần
            let existingReviews: any[] = [];
            try {
                const checkRes = await fetch(`${BASE_URL}/reviews/order/${backendOrderId}`);
                if (checkRes.ok) {
                    const data = await checkRes.json();
                    // API có thể trả về array hoặc object với data property
                    existingReviews = Array.isArray(data) ? data : (data.data || []);
                    console.log(`📋 Found ${existingReviews.length} existing reviews for order ${backendOrderId}`);
                }
            } catch (e) {
                console.log('Could not fetch existing reviews:', e);
            }

            // Gửi đánh giá cho từng sản phẩm tuần tự để tránh race condition
            const submittedReviews = [];
            const alreadyReviewedCount = { count: 0 };
            const errors: string[] = [];
            const totalToReview = items.filter((item: any, idx: number) => {
                const itemKey = `${item.productId || item._id || idx}_${item.color}_${item.size}`;
                const productReview = productRatings[itemKey];
                return productReview && productReview.rating && productReview.rating > 0;
            }).length;
            
            console.log(`🎯 Total products to review: ${totalToReview}`);
            
            for (let index = 0; index < items.length; index++) {
                const item = items[index];
                const itemKey = `${item.productId || item._id || index}_${item.color}_${item.size}`;
                const productReview = productRatings[itemKey];
                
                if (!productReview || !productReview.rating) {
                    continue;
                }

                const productId = item.productId || item._id || null;
                const itemColor = (item.color || '').trim();
                const itemSize = (item.size || '').trim();
                
                // Kiểm tra xem đã có review cho item này chưa (từ danh sách đã fetch)
                // So sánh chính xác: productId + color + size
                const alreadyReviewed = existingReviews.some((rev: any) => {
                    // Kiểm tra userId trước để đảm bảo là review của user hiện tại
                    const revUserId = rev.userId?._id || rev.userId;
                    if (!compareIds(revUserId, user._id)) {
                        return false;
                    }
                    
                    // Kiểm tra productId
                    if (!productId || !rev.productId) {
                        return false;
                    }
                    
                    const revProductId = rev.productId._id || rev.productId;
                    if (!compareIds(revProductId, productId)) {
                        return false;
                    }
                    
                    // Nếu có items, kiểm tra color và size
                    if (rev.items && rev.items.length > 0) {
                        const revItem = rev.items[0];
                        const revColor = String(revItem.color || '').trim();
                        const revSize = String(revItem.size || '').trim();
                        // So sánh chính xác (không lowercase để tránh false positive)
                        return revColor === itemColor && revSize === itemSize;
                    }
                    
                    // Nếu không có items trong review, chỉ so sánh productId
                    // Nhưng chỉ khi item hiện tại cũng không có color/size
                    if (!itemColor && !itemSize) {
                        return true;
                    }
                    
                    return false;
                });
                
                if (alreadyReviewed) {
                    console.log(`⏭️ Review already exists for ${item.name} (${itemColor}, ${itemSize}), skipping...`);
                    alreadyReviewedCount.count++;
                    continue;
                }
                
                console.log(`📝 Submitting review for ${item.name} (${itemColor}, ${itemSize})...`);
                
                const reviewData = {
                    orderId: backendOrderId,
                    userId: user._id,
                    productId: productId,
                    rating: productReview.rating,
                    comment: (productReview.comment || '').trim(),
                    items: [item]
                };

                try {
                    // Retry logic: thử tối đa 2 lần nếu gặp duplicate error
                    let retryCount = 0;
                    let success = false;
                    
                    while (retryCount < 2 && !success) {
                        // Refresh existing reviews trước mỗi lần thử để có dữ liệu mới nhất
                        if (retryCount > 0) {
                            try {
                                const refreshRes = await fetch(`${BASE_URL}/reviews/order/${backendOrderId}`);
                                if (refreshRes.ok) {
                                    const refreshData = await refreshRes.json();
                                    existingReviews = Array.isArray(refreshData) ? refreshData : (refreshData.data || []);
                                    console.log(`🔄 Refreshed existing reviews: ${existingReviews.length} reviews found`);
                                    
                                    // Kiểm tra lại xem đã có review chưa sau khi refresh
                                    const stillExists = existingReviews.some((rev: any) => {
                                        const revUserId = rev.userId?._id || rev.userId;
                                        if (!compareIds(revUserId, user._id)) return false;
                                        
                                        if (!productId || !rev.productId) return false;
                                        
                                        const revProductId = rev.productId._id || rev.productId;
                                        const productMatches = compareIds(revProductId, productId);
                                        
                                        console.log(`🔍 Checking review match:`, {
                                            currentProduct: productId,
                                            currentItem: `${item.name} (${itemColor}, ${itemSize})`,
                                            reviewProduct: revProductId,
                                            reviewItem: rev.items?.[0] ? `${rev.items[0].name} (${rev.items[0].color}, ${rev.items[0].size})` : 'No items',
                                            productMatches
                                        });
                                        
                                        if (!productMatches) return false;
                                        
                                        if (rev.items && rev.items.length > 0) {
                                            const revItem = rev.items[0];
                                            const revColor = String(revItem.color || '').trim();
                                            const revSize = String(revItem.size || '').trim();
                                            const colorSizeMatch = revColor === itemColor && revSize === itemSize;
                                            console.log(`🔍 Color/Size match: ${colorSizeMatch} (${revColor} === ${itemColor} && ${revSize} === ${itemSize})`);
                                            return colorSizeMatch;
                                        }
                                        
                                        if (!itemColor && !itemSize) return true;
                                        
                                        return false;
                                    });
                                    
                                    console.log(`🔍 stillExists result: ${stillExists}`);
                                    
                                    if (stillExists) {
                                        console.log(`⏭️ Review already exists for ${item.name} (after refresh), skipping...`);
                                        alreadyReviewedCount.count++;
                                        success = true; // Mark as handled
                                        break;
                                    } else {
                                        console.log(`✅ No existing review found, will retry submission for ${item.name}`);
                                    }
                                    
                                    // Đợi thêm một chút trước khi retry
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                }
                            } catch (refreshErr) {
                                console.log('Could not refresh reviews:', refreshErr);
                            }
                        }
                        
                        const res = await fetch(`${BASE_URL}/reviews`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(reviewData)
                        });

                        const responseData = await res.json();
                        if (!res.ok) {
                            // Nếu lỗi do đã đánh giá rồi
                            if (responseData?.message?.includes('đã đánh giá')) {
                                if (retryCount === 0) {
                                    // Lần đầu gặp lỗi, thử refresh và retry
                                    retryCount++;
                                    console.log(`⚠️ Duplicate error for ${item.name}, retrying... (attempt ${retryCount + 1})`);
                                    continue;
                                } else {
                                    // Đã retry rồi, bỏ qua
                                    console.log(`⏭️ Review already exists for ${item.name} (after retry), skipping...`);
                                    alreadyReviewedCount.count++;
                                    success = true;
                                    break;
                                }
                            }
                            throw new Error(responseData?.message || 'Không thể gửi đánh giá');
                        }
                        
                        // Submit thành công
                        submittedReviews.push(responseData);
                        existingReviews.push(responseData);
                        console.log(`✅ Successfully submitted review ${submittedReviews.length}/${totalToReview} for ${item.name} (${itemColor}, ${itemSize})`);
                        success = true;
                    }
                    
                    if (!success && retryCount >= 2) {
                        throw new Error('Không thể gửi đánh giá sau nhiều lần thử');
                    }
                    
                    // Thêm delay lớn hơn giữa các request để tránh race condition với database
                    // Delay 300ms để đảm bảo review trước đã được lưu vào DB
                    if (index < items.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                } catch (error: any) {
                    console.error(`❌ Error submitting review for product ${item.name}:`, error);
                    // Nếu lỗi do đã đánh giá rồi, đếm vào alreadyReviewed
                    if (error.message?.includes('đã đánh giá')) {
                        console.log(`⏭️ Review already exists for ${item.name} (error catch), skipping...`);
                        alreadyReviewedCount.count++;
                        continue;
                    }
                    errors.push(`${item.name}: ${error.message || 'Lỗi không xác định'}`);
                }
            }
            
            console.log(`📊 Final count - Submitted: ${submittedReviews.length}, Already reviewed: ${alreadyReviewedCount.count}, Errors: ${errors.length}, Total: ${totalToReview}`);

            try {
                if (errors.length > 0 && submittedReviews.length === 0) {
                    throw new Error(`Không thể gửi đánh giá:\n${errors.join('\n')}`);
                }
                
                if (submittedReviews.length === 0 && alreadyReviewedCount.count === 0) {
                    Alert.alert('Thông báo', 'Không có sản phẩm nào được đánh giá.');
                    setLoading(false);
                    return;
                }
                
                if (submittedReviews.length === 0 && alreadyReviewedCount.count > 0) {
                    Alert.alert('Thông báo', `Tất cả ${alreadyReviewedCount.count} sản phẩm đã được đánh giá rồi.`);
                    router.back();
                    setLoading(false);
                    return;
                }
                
                // Lưu local để đảm bảo
                const reviewKey1 = `review_${user._id}_${id}`;
                await AsyncStorage.setItem(reviewKey1, JSON.stringify({
                    orderId: backendOrderId,
                    userId: user._id,
                    productRatings,
                    createdAt: new Date().toISOString()
                }));

                if (backendOrderId !== id) {
                    const reviewKey2 = `review_${user._id}_${backendOrderId}`;
                    await AsyncStorage.setItem(reviewKey2, JSON.stringify({
                        orderId: backendOrderId,
                        userId: user._id,
                        productRatings,
                        createdAt: new Date().toISOString()
                    }));
                }

                // Tạo thông báo chính xác
                let successMsg = '';
                const totalProcessed = submittedReviews.length + alreadyReviewedCount.count;
                
                if (submittedReviews.length === totalToReview) {
                    // Tất cả đều thành công (không có sản phẩm nào đã được đánh giá trước đó)
                    successMsg = `Đã đánh giá thành công ${submittedReviews.length} sản phẩm!`;
                } else if (submittedReviews.length > 0 && alreadyReviewedCount.count > 0) {
                    // Một số thành công, một số đã được đánh giá trước đó
                    if (totalProcessed === totalToReview) {
                        successMsg = `Đã đánh giá thành công ${submittedReviews.length} sản phẩm. ${alreadyReviewedCount.count} sản phẩm đã được đánh giá trước đó.`;
                    } else {
                        successMsg = `Đã đánh giá thành công ${submittedReviews.length} sản phẩm. ${alreadyReviewedCount.count} sản phẩm đã được đánh giá trước đó.`;
                    }
                } else if (submittedReviews.length > 0 && errors.length > 0) {
                    // Một số thành công, một số lỗi
                    successMsg = `Đã đánh giá thành công ${submittedReviews.length}/${totalToReview} sản phẩm. Có ${errors.length} sản phẩm gặp lỗi.`;
                } else if (submittedReviews.length > 0) {
                    // Chỉ có thành công
                    successMsg = `Đã đánh giá thành công ${submittedReviews.length} sản phẩm!`;
                } else {
                    successMsg = `Đã đánh giá thành công ${submittedReviews.length} sản phẩm!`;
                }
                
                console.log(`💬 Success message: ${successMsg}`);
                
                Alert.alert('Thành công', successMsg, [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } catch (error: any) {
                console.error('Error submitting reviews:', error);
                const errorMsg = errors.length > 0 
                    ? `Lỗi: ${errors.join('\n')}`
                    : (error.message || 'Không thể gửi đánh giá. Vui lòng thử lại.');
                Alert.alert('Lỗi', errorMsg);
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
            <ScrollView contentContainerStyle={styles.container}>
                {order && (() => {
                    // Lấy tên và số điện thoại từ địa chỉ nhận hàng
                    const { name, phone } = parseAddressInfo(
                        order.address,
                        'Khách hàng',
                        '-'
                    );
                    const customerName = name;
                    const customerPhone = phone;

                    return (
                        <>
                            <View style={styles.orderInfo}>
                                <Text style={styles.orderLabel}>Mã đơn hàng:</Text>
                                <Text style={styles.orderValue}>{String(order.id || order._id)}</Text>
                            </View>

                            <View style={styles.customerInfo}>
                                <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
                                <View style={styles.customerRow}>
                                    <Text style={styles.customerLabel}>Tên khách hàng:</Text>
                                    <Text style={styles.customerValue}>{customerName}</Text>
                                </View>
                                <View style={styles.customerRow}>
                                    <Text style={styles.customerLabel}>Số điện thoại:</Text>
                                    <Text style={styles.customerValue}>{customerPhone}</Text>
                                </View>
                            </View>

                            {/* Products in order with individual reviews */}
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
                                                
                                                {/* Rating Stars for this product */}
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

                                                {/* Comment Input for this product */}
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
                    );
                })()}

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
    customerInfo: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
    },
    customerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    customerLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    customerValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
        flex: 2,
        textAlign: 'right',
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
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#222',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 80,
    },
    productItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    productReviewCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#222',
        marginBottom: 12,
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

