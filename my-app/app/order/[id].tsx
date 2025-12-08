import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, ScrollView, TouchableOpacity, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { DOMAIN, BASE_URL } from '../../config/apiConfig';

const STATUS_ORDER = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng'] as const;

const STATUS_INFO: Record<string, { emoji: string; color: string }> = {
    'Chờ thanh toán': { emoji: '💳', color: '#f59e0b' },
    'Chờ xác nhận': { emoji: '🛒', color: '#0ea5e9' },
    'Đã xác nhận': { emoji: '📦', color: '#22c55e' },
    'Đang giao hàng': { emoji: '🚚', color: '#f59e0b' },
    'Đã giao hàng': { emoji: '✅', color: '#16a34a' },
    'Đã hủy': { emoji: '❌', color: '#ef4444' },
};

function normalizeStatus(raw?: string) {
    if (!raw) return 'Chờ xác nhận';
    const s = String(raw).trim();
    if (s === 'Đang xử lý' || s.toLowerCase() === 'pending') return 'Chờ xác nhận';
    if (s.toLowerCase() === 'chờ thanh toán' || s.toLowerCase() === 'waiting payment' || s.toLowerCase() === 'pending payment') return 'Chờ thanh toán';
    if (s.toLowerCase() === 'confirmed') return 'Đã xác nhận';
    if (s.toLowerCase() === 'shipping' || s === 'Đang vận chuyển') return 'Đang giao hàng';
    if (s.toLowerCase() === 'delivered') return 'Đã giao hàng';
    if (s.toLowerCase() === 'cancelled' || s.toLowerCase() === 'canceled') return 'Đã hủy';
    return STATUS_INFO[s] ? s : 'Chờ xác nhận';
}

function formatPaymentMethod(payment?: string) {
    if (!payment) return '—';
    const p = String(payment).toLowerCase().trim();
    if (p === 'cod') return 'Tiền mặt';
    if (p === 'zalopay') return 'ZaloPay';
    return payment;
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [order, setOrder] = useState<any | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadOrder = async () => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) {
            router.replace('/(tabs)/login');
            return;
        }

        // ✅ Luôn load từ backend trước để có dữ liệu mới nhất
        let found = null;
        try {
            const res = await fetch(`${DOMAIN}/api/orders/${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data && (data._id || data.id)) {
                    found = data;
                }
            }
        } catch (e) {
            console.log('Error loading from backend:', e);
        }

        // Nếu backend không có, fallback sang AsyncStorage
        if (!found) {
            const historyKey = `order_history_${user._id}`;
            const historyString = await AsyncStorage.getItem(historyKey);
            let history = historyString ? JSON.parse(historyString) : [];
            history = Array.isArray(history) ? history : [];
            found = history.find((o: any) => String(o.id || o._id) === String(id));
        }

        setOrder(found || null);
    };

    // Load reviews cho đơn hàng
    const loadReviews = async () => {
        if (!order) return;
        setLoadingReviews(true);
        try {
            const backendId = order._id || (String(id).length === 24 ? id : null);
            const checkId = backendId || id;
            const res = await fetch(`${BASE_URL}/reviews/order/${checkId}`);
            if (res.ok) {
                const data = await res.json();
                const reviewsList = Array.isArray(data) ? data : [];
                setReviews(reviewsList);
            }
        } catch (e) {
            console.log('Error loading reviews:', e);
        } finally {
            setLoadingReviews(false);
        }
    };

    useEffect(() => {
        loadOrder();
    }, [id]);

    useEffect(() => {
        if (order) {
            loadReviews();
        }
    }, [order]);

    useFocusEffect(React.useCallback(() => {
        loadOrder();
        if (order) {
            loadReviews();
        }

        // Auto-refresh mỗi 3 giây để cập nhật trạng thái từ admin
        const interval = setInterval(() => {
            loadOrder();
        }, 3000);

        return () => {
            clearInterval(interval);
        };
    }, [id]));

    // Pull to refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrder();
        if (order) {
            await loadReviews();
        }
        setRefreshing(false);
    };

    const status = normalizeStatus(order?.status);
    const created = order?.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '';
    const shippingDate = order?.shippingDate ? new Date(order.shippingDate).toLocaleString('vi-VN') : null;
    const deliveredDate = order?.deliveredDate ? new Date(order.deliveredDate).toLocaleString('vi-VN') : null;
    const cancelledDate = order?.cancelledDate ? new Date(order.cancelledDate).toLocaleString('vi-VN') : null;

    const currentIndex = useMemo(() => Math.max(0, STATUS_ORDER.indexOf(status as any)), [status]);

    // Helper function để so sánh ID
    const compareIds = (id1: any, id2: any): boolean => {
        if (!id1 || !id2) return false;
        const str1 = String(id1._id || id1);
        const str2 = String(id2._id || id2);
        return str1 === str2;
    };

    // Kiểm tra xem tất cả sản phẩm đã được đánh giá chưa
    const checkReviewExists = async () => {
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id || !order || !Array.isArray(order.items)) return false;

            const backendId = order?._id || (String(id).length === 24 ? id : null);
            const checkId = backendId || id;

            // Kiểm tra từ API
            try {
                const res = await fetch(`${BASE_URL}/reviews/order/${checkId}`);
                if (res.ok) {
                    const data = await res.json();
                    const reviewsList = Array.isArray(data) ? data : [];
                    // Lọc reviews của user hiện tại
                    const userReviews = reviewsList.filter((r: any) => {
                        const reviewUserId = (typeof r.userId === 'object' && r.userId?._id) ? r.userId._id : (r.userId || null);
                        return String(reviewUserId) === String(user._id);
                    });

                    // Kiểm tra xem mỗi sản phẩm đã có review chưa
                    const itemsWithReviews = order.items.filter((item: any) => {
                        const productId = item.productId || item._id;
                        if (!productId) return false;

                        const itemColor = String(item.color || '').trim();
                        const itemSize = String(item.size || '').trim();

                        return userReviews.some((rev: any) => {
                            if (!rev.productId) return false;
                            if (!compareIds(rev.productId, productId)) return false;

                            // Kiểm tra color và size nếu có
                            if (rev.items && rev.items.length > 0) {
                                const revItem = rev.items[0];
                                const revColor = String(revItem.color || '').trim();
                                const revSize = String(revItem.size || '').trim();
                                // So sánh chính xác color và size
                                return revColor === itemColor && revSize === itemSize;
                            }

                            // Nếu review không có items, chỉ so sánh productId
                            return !itemColor && !itemSize;
                        });
                    });

                    console.log(`🔍 Check review exists: ${itemsWithReviews.length}/${order.items.length} items reviewed`);

                    // Nếu tất cả sản phẩm đã có review, return true
                    return itemsWithReviews.length === order.items.length;
                }
            } catch (e) {
                console.log('API check failed:', e);
            }

            return false;
        } catch {
            return false;
        }
    };

    const handleCancel = () => {
        if (!order) return;
        if (status === 'Đã giao hàng' || status === 'Đã hủy') return;
        setShowCancelDialog(true);
    };

    const confirmCancel = async () => {
        if (!cancelReason.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập lý do hủy đơn');
            return;
        }

        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;

        const historyKey = `order_history_${user._id}`;
        const historyString = await AsyncStorage.getItem(historyKey);
        let history = historyString ? JSON.parse(historyString) : [];
        history = Array.isArray(history) ? history : [];

        const backendId = order._id || (String(id).length === 24 ? id : null);
        if (backendId) {
            try {
                await fetch(`${BASE_URL}/orders/${backendId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'Đã hủy',
                        cancelReason: cancelReason.trim()
                    })
                });
            } catch (e) {
                console.log('PATCH /orders/:id/status failed', e);
            }
        }

        history = history.map((o: any) => (String(o.id || o._id) === String(id) ? {
            ...o,
            status: 'Đã hủy',
            cancelledDate: new Date().toISOString(),
            cancelReason: cancelReason.trim()
        } : o));
        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
        const updated = history.find((o: any) => String(o.id || o._id) === String(id));
        setOrder(updated || null);

        setShowCancelDialog(false);
        setCancelReason('');
        Alert.alert('Thành công', 'Đơn hàng đã được hủy');
    };

    const handleReviewPress = async () => {
        const hasReviewed = await checkReviewExists();
        if (hasReviewed) {
            Alert.alert('Thông báo', 'Bạn đã đánh giá đơn hàng này rồi');
            return;
        }
        router.push(`/review/${id}` as any);
    };

    if (!order) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
                <View style={{ padding: 16 }}>
                    <Text style={{ color: '#666' }}>Không tìm thấy đơn hàng.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
            <ScrollView
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#ff4757']}
                        tintColor="#ff4757"
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.orderCode}>Mã đơn: {String(order.id || order._id)}</Text>
                        <Text style={styles.meta}>Đặt hàng: {created}</Text>
                        {shippingDate && (
                            <Text style={[styles.meta, { color: '#f59e0b', marginTop: 4 }]}>
                                🚚 Bắt đầu giao: {shippingDate}
                            </Text>
                        )}
                        {deliveredDate && (
                            <Text style={[styles.meta, { color: '#22c55e', marginTop: 4 }]}>
                                ✅ Hoàn thành: {deliveredDate}
                            </Text>
                        )}
                        {cancelledDate && (
                            <Text style={[styles.meta, { color: '#ef4444', marginTop: 4 }]}>
                                ❌ Đã hủy: {cancelledDate}
                            </Text>
                        )}
                    </View>
                    {status !== 'Đã hủy' && (
                        <View style={[styles.statusPill, { borderColor: STATUS_INFO[status].color }]}>
                            <Text style={[styles.statusBadge, { color: STATUS_INFO[status].color }]} numberOfLines={1}>
                                {STATUS_INFO[status].emoji} {status}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Stepper */}
                {status === 'Đã hủy' ? null : status === 'Chờ thanh toán' ? (
                    <View style={[styles.cancelWrap, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                        <Text style={[styles.cancelText, { color: '#f59e0b' }]}>{STATUS_INFO['Chờ thanh toán'].emoji} Chờ thanh toán</Text>
                    </View>
                ) : (
                    <View style={styles.stepperWrap}>
                        {/* Horizontal line connecting all circles */}
                        <View style={styles.stepLineContainer}>
                            {STATUS_ORDER.map((step, i) => {
                                if (i === STATUS_ORDER.length - 1) return null;
                                // Vạch nối giữa step i và i+1 có màu của step i+1 nếu cả hai đều active
                                const isComplete = i + 1 <= currentIndex;
                                const lineColor = isComplete ? STATUS_INFO[STATUS_ORDER[i + 1]].color : '#e5e7eb';
                                return (
                                    <View key={`line-${i}`} style={[styles.stepConnector, { backgroundColor: lineColor }]} />
                                );
                            })}
                        </View>
                        {/* Circles and labels */}
                        <View style={styles.stepContainer}>
                            {STATUS_ORDER.map((step, i) => {
                                const active = i <= currentIndex;
                                const stepColor = active ? STATUS_INFO[step].color : '#e5e7eb';
                                return (
                                    <View key={step} style={styles.stepItem}>
                                        <View style={[styles.stepCircle, { backgroundColor: stepColor }]}>
                                            <Text style={styles.stepEmoji}>{STATUS_INFO[step].emoji}</Text>
                                        </View>
                                        <Text style={[styles.stepLabel, { color: active ? stepColor : '#666' }]} numberOfLines={2} adjustsFontSizeToFit>
                                            {step}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Address & payment */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
                    <Text style={styles.text}>{order.address}</Text>
                    <Text style={[styles.text, { marginTop: 6 }]}>Phương thức thanh toán: {formatPaymentMethod(order.payment)}</Text>
                </View>

                {/* Items */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sản phẩm</Text>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((it: any, idx: number) => {
                            const productId = it.productId || it._id;
                            const itemColor = it.color || '';
                            const itemSize = it.size || '';

                            // Tìm reviews cho sản phẩm này
                            const itemReviews = reviews.filter((rev: any) => {
                                if (!rev.productId || !productId) return false;
                                if (!compareIds(rev.productId, productId)) return false;

                                // Kiểm tra color và size nếu có
                                if (rev.items && rev.items.length > 0 && itemColor && itemSize) {
                                    const revItem = rev.items[0];
                                    return revItem.color === itemColor && revItem.size === itemSize;
                                }
                                return true;
                            });

                            return (
                                <View key={idx}>
                                    <View style={styles.itemRow}>
                                        {it.image ? (
                                            <Image source={{ uri: `${DOMAIN}${it.image}` }} style={styles.itemImage} />
                                        ) : (
                                            <View style={[styles.itemImage, { backgroundColor: '#f0f0f0' }]} />
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemName}>{it.name}</Text>
                                            <Text style={styles.itemMeta}>{[it.size, it.color].filter(Boolean).join(', ') || '—'}</Text>
                                            <Text style={styles.itemMeta}>x{it.qty}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.itemPrice}>{((it.price || 0) * (it.qty || 0)).toLocaleString('vi-VN')} VND</Text>
                                            {Number(it.discountAmount || 0) > 0 && (
                                                <Text style={{ color: '#22c55e', fontSize: 12, marginTop: 2 }}>
                                                    -{Number(it.discountAmount).toLocaleString('vi-VN')} VND
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Hiển thị reviews cho sản phẩm này */}
                                    {itemReviews.length > 0 && (
                                        <View style={styles.reviewSection}>
                                            <Text style={styles.reviewSectionTitle}>Đánh giá của bạn:</Text>
                                            {itemReviews.map((rev: any, revIdx: number) => (
                                                <View key={revIdx} style={styles.reviewItem}>
                                                    <View style={styles.reviewRating}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Text key={star} style={styles.star}>
                                                                {star <= (rev.rating || 0) ? '⭐' : '☆'}
                                                            </Text>
                                                        ))}
                                                        <Text style={styles.reviewRatingText}>({rev.rating || 0}/5)</Text>
                                                    </View>
                                                    {rev.comment && (
                                                        <Text style={styles.reviewComment}>{rev.comment}</Text>
                                                    )}
                                                    {rev.createdAt && (
                                                        <Text style={styles.reviewDate}>
                                                            {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {idx < order.items.length - 1 && (
                                        <View style={{ borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 10 }} />
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.text}>Không có sản phẩm.</Text>
                    )}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10, paddingTop: 10 }}>
                        <Text style={{ fontWeight: 'bold', color: '#ef233c', textAlign: 'right' }}>Tổng cộng: {Number(order.total || 0).toLocaleString('vi-VN')} VND</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: '#111827' }]}>
                        <Text style={styles.actionText}>Quay lại</Text>
                    </TouchableOpacity>
                    {status === 'Đã giao hàng' && (
                        <TouchableOpacity
                            onPress={handleReviewPress}
                            style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                        >
                            <Text style={styles.actionText}>Đánh giá</Text>
                        </TouchableOpacity>
                    )}
                    {status === 'Chờ thanh toán' ? (
                        <TouchableOpacity
                            onPress={() => router.push(`/checkout?orderId=${order._id || order.id}` as any)}
                            style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
                        >
                            <Text style={styles.actionText}>Thanh toán lại</Text>
                        </TouchableOpacity>
                    ) : status !== 'Đã giao hàng' && status !== 'Đã hủy' && (
                        <TouchableOpacity onPress={handleCancel} style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}>
                            <Text style={styles.actionText}>Hủy đơn</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Dialog hủy đơn */}
            <Modal
                visible={showCancelDialog}
                animationType="fade"
                transparent
                onRequestClose={() => setShowCancelDialog(false)}
            >
                <View style={styles.cancelDialogOverlay}>
                    <View style={styles.cancelDialogContainer}>
                        <Text style={styles.cancelDialogTitle}>Lý do hủy đơn</Text>
                        <Text style={styles.cancelDialogSubtitle}>Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này</Text>

                        <TextInput
                            style={styles.cancelReasonInput}
                            placeholder="Nhập lý do hủy đơn..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            textAlignVertical="top"
                        />

                        <View style={styles.cancelDialogActions}>
                            <TouchableOpacity
                                style={[styles.cancelDialogBtn, styles.cancelDialogBtnSecondary]}
                                onPress={() => {
                                    setShowCancelDialog(false);
                                    setCancelReason('');
                                }}
                            >
                                <Text style={styles.cancelDialogBtnTextSecondary}>Đóng</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cancelDialogBtn, styles.cancelDialogBtnPrimary]}
                                onPress={confirmCancel}
                            >
                                <Text style={styles.cancelDialogBtnTextPrimary}>Xác nhận hủy</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', rowGap: 6 },
    orderCode: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    meta: { color: '#666', marginTop: 2 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, borderWidth: 1, backgroundColor: '#fff', alignSelf: 'flex-start', maxWidth: '60%' },
    statusBadge: { fontWeight: 'bold', flexShrink: 1 },
    card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
    cardTitle: { fontWeight: 'bold', marginBottom: 8, color: '#222' },
    text: { color: '#333' },
    // Items
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    itemImage: { width: 54, height: 54, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
    itemName: { fontWeight: '600', color: '#222' },
    itemMeta: { color: '#666', fontSize: 12, marginTop: 2 },
    itemPrice: { fontWeight: '600', color: '#222' },
    // Stepper
    stepperWrap: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 20, paddingHorizontal: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 12, position: 'relative' },
    stepLineContainer: { position: 'absolute', top: 38, left: 40, right: 40, height: 4, flexDirection: 'row', zIndex: 0 },
    stepConnector: { flex: 1, height: 4, borderRadius: 2 },
    stepContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', zIndex: 1 },
    stepItem: { flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 },
    stepCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    stepEmoji: { fontSize: 18 },
    stepLabel: { fontSize: 11, textAlign: 'center', color: '#666', fontWeight: '500', lineHeight: 13, paddingHorizontal: 2, minHeight: 26 },
    cancelWrap: { backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 12 },
    cancelText: { color: '#ef4444', fontWeight: 'bold' },
    // Actions
    actionBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
    actionText: { color: '#fff', fontWeight: '600' },
    // Reviews
    reviewSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 10,
        marginLeft: 64,
    },
    reviewSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8
    },
    reviewItem: {
        marginBottom: 8,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    star: {
        fontSize: 14,
        marginRight: 2
    },
    reviewRatingText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '600',
        color: '#f59e0b'
    },
    reviewComment: {
        fontSize: 13,
        color: '#333',
        marginTop: 4,
        lineHeight: 18,
    },
    reviewDate: {
        fontSize: 11,
        color: '#999',
        marginTop: 4
    },
    // Dialog hủy đơn styles
    cancelDialogOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cancelDialogContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    cancelDialogTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
    },
    cancelDialogSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    cancelReasonInput: {
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#1a1a1a',
        backgroundColor: '#f9fafb',
        marginBottom: 20,
        minHeight: 100,
    },
    cancelDialogActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelDialogBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelDialogBtnSecondary: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    cancelDialogBtnPrimary: {
        backgroundColor: '#ef4444',
    },
    cancelDialogBtnTextSecondary: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    cancelDialogBtnTextPrimary: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});


