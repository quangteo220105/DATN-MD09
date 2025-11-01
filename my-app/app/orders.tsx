import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { BASE_URL, DOMAIN } from '../config/apiConfig';
import { useFocusEffect } from '@react-navigation/native';
import ReactNative from 'react';

const STATUS_ORDER = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng'] as const;

const STATUS_INFO: Record<string, { emoji: string; color: string }> = {
    'Chờ xác nhận': { emoji: '🛒', color: '#0ea5e9' },
    'Đã xác nhận': { emoji: '📦', color: '#22c55e' },
    'Đang giao hàng': { emoji: '🚚', color: '#f59e0b' },
    'Đã giao hàng': { emoji: '', color: '#16a34a' },
    'Đã hủy': { emoji: '', color: '#ef4444' },
};

function normalizeStatus(raw?: string) {
    if (!raw) return 'Chờ xác nhận';
    const s = String(raw).trim();
    if (s === 'Đang xử lý' || s.toLowerCase() === 'pending') return 'Chờ xác nhận';
    if (s.toLowerCase() === 'confirmed') return 'Đã xác nhận';
    if (s.toLowerCase() === 'shipping' || s === 'Đang vận chuyển') return 'Đang giao hàng';
    if (s.toLowerCase() === 'delivered') return 'Đã giao hàng';
    if (s.toLowerCase() === 'cancelled' || s.toLowerCase() === 'canceled') return 'Đã hủy';
    return STATUS_INFO[s] ? s : 'Chờ xác nhận';
}

export default function OrdersScreen() {
    const [orders, setOrders] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('Tất cả');
    const router = useRouter();

    const fetchOrders = React.useCallback(async () => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) {
            router.replace('/(tabs)/login');
            return;
        }
        try {
            const res = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
            const json = await res.json();
            const list = Array.isArray(json) ? json : json.data || [];
            if (Array.isArray(list)) {
                setOrders(list);
                return;
            }
        } catch { }
        // Fallback: lấy từ AsyncStorage cục bộ
        const historyKey = `order_history_${user._id}`;
        const historyString = await AsyncStorage.getItem(historyKey);
        let history = historyString ? JSON.parse(historyString) : [];
        history = Array.isArray(history) ? history : [];
        setOrders(history);
    }, [router]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useFocusEffect(React.useCallback(() => { fetchOrders(); }, [fetchOrders]));

    const renderStepper = (statusRaw: string) => {
        const status = normalizeStatus(statusRaw);
        if (status === 'Đã hủy') {
            return (
                <View style={[styles.cancelWrap]}>
                    <Text style={[styles.cancelText]}>{STATUS_INFO['Đã hủy'].emoji} Đã hủy</Text>
                </View>
            );
        }
        const currentIndex = Math.max(0, STATUS_ORDER.indexOf(status as any));
        return (
            <View style={styles.stepperWrap}>
                <View style={styles.stepRow}>
                    {STATUS_ORDER.map((step, i) => {
                        const active = i <= currentIndex;
                        const color = active ? STATUS_INFO[step].color : '#e5e7eb';
                        const isLast = i === STATUS_ORDER.length - 1;
                        return (
                            <React.Fragment key={step}>
                                <View style={[styles.stepCircle, { backgroundColor: color }]}>
                                    <Text style={styles.stepEmoji}>{STATUS_INFO[step].emoji}</Text>
                                </View>
                                {!isLast && <View style={[styles.stepLineFlex, { backgroundColor: color }]} />}
                            </React.Fragment>
                        );
                    })}
                </View>
                <View style={styles.stepLabelsRow}>
                    {STATUS_ORDER.map((step, i) => {
                        const active = i <= currentIndex;
                        return (
                            <Text key={step} style={[styles.stepLabelFlex, active ? { color: STATUS_INFO[step].color } : null]}>{step}</Text>
                        );
                    })}
                </View>
            </View>
        );
    };

    const checkReviewExists = async (orderId: any, orderBackendId?: any) => {
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) return false;
            
            // ƯU TIÊN: Kiểm tra từ API trước (nếu admin xóa thì trong database sẽ không còn)
            const checkId = orderBackendId || orderId;
            try {
                const res = await fetch(`${BASE_URL}/reviews/order/${checkId}`);
                if (res.ok) {
                    const data = await res.json();
                    const reviews = Array.isArray(data) ? data : [];
                    // Chỉ kiểm tra đánh giá của user hiện tại (hỗ trợ cả populate và không populate)
                    const userReview = reviews.find((r: any) => {
                        const reviewUserId = (typeof r.userId === 'object' && r.userId?._id) ? r.userId._id : (r.userId || null);
                        return String(reviewUserId) === String(user._id);
                    });
                    if (userReview) return true;
                }
            } catch (e) {
                console.log('API check failed, checking local:', e);
            }
            
            // Fallback: Kiểm tra trong AsyncStorage (khi không có kết nối)
            const reviewKey1 = `review_${user._id}_${orderId}`;
            const reviewString1 = await AsyncStorage.getItem(reviewKey1);
            if (reviewString1) {
                // Nếu có trong local, vẫn kiểm tra lại API một lần nữa để đảm bảo
                try {
                    const res = await fetch(`${BASE_URL}/reviews/order/${checkId}`);
                    if (res.ok) {
                        const data = await res.json();
                        const reviews = Array.isArray(data) ? data : [];
                        const userReview = reviews.find((r: any) => {
                            const reviewUserId = (typeof r.userId === 'object' && r.userId?._id) ? r.userId._id : (r.userId || null);
                            return String(reviewUserId) === String(user._id);
                        });
                        // Nếu không tìm thấy trong API nhưng có trong local, xóa local để sync
                        if (!userReview) {
                            await AsyncStorage.removeItem(reviewKey1);
                            if (orderBackendId && orderBackendId !== orderId) {
                                await AsyncStorage.removeItem(`review_${user._id}_${orderBackendId}`);
                            }
                            return false;
                        }
                        return true;
                    }
                } catch {}
                // Nếu không kết nối được API, dùng dữ liệu local
                return true;
            }
            
            if (orderBackendId && orderBackendId !== orderId) {
                const reviewKey2 = `review_${user._id}_${orderBackendId}`;
                const reviewString2 = await AsyncStorage.getItem(reviewKey2);
                if (reviewString2) return true;
            }
            
            return false;
        } catch {
            return false;
        }
    };

    const handleCancel = async (orderId: any, backendId?: any) => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;
        const historyKey = `order_history_${user._id}`;
        const historyString = await AsyncStorage.getItem(historyKey);
        let history = historyString ? JSON.parse(historyString) : [];
        history = Array.isArray(history) ? history : [];
        // Try update backend first if backend id provided
        if (backendId) {
            try {
                await fetch(`${BASE_URL}/orders/${backendId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Đã hủy' })
                });
            } catch (e) {
                console.log('PATCH /orders/:id/status failed', e);
            }
        }
        history = history.map((o: any) => (o.id === orderId || o._id === orderId) ? { ...o, status: 'Đã hủy' } : o);
        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
        setOrders(history);
    };

    const handleReviewPress = async (item: any) => {
        const orderId = item.id || item._id;
        const hasReviewed = await checkReviewExists(orderId, item._id);
        if (hasReviewed) {
            Alert.alert('Thông báo', 'Bạn đã đánh giá đơn hàng này rồi');
            return;
        }
        router.push(`/review/${orderId}` as any);
    };

    const renderItem = ({ item }: { item: any }) => {
        const created = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
        const status = normalizeStatus(item.status);
        return (
            <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.date}>{created}</Text>
                    <Text style={[styles.badge, { color: STATUS_INFO[status].color }]}>{STATUS_INFO[status].emoji} {status}</Text>
                </View>
                {renderStepper(status)}
                <View style={{ marginTop: 8 }}>
                    {(item.items || []).slice(0, 3).map((p: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            {p.image ? (
                                <Image source={{ uri: `${DOMAIN}${p.image}` }} style={styles.productImage} />
                            ) : (
                                <View style={[styles.productImage, { backgroundColor: '#f0f0f0' }]} />
                            )}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.productName}>{p.name}</Text>
                                <Text style={styles.productMeta}>({p.size}, {p.color}) x{p.qty}</Text>
                            </View>
                            <Text style={styles.productPrice}>{(p.price * p.qty).toLocaleString('vi-VN')} VND</Text>
                        </View>
                    ))}
                    {Array.isArray(item.items) && item.items.length > 3 && (
                        <Text style={{ color: '#666', marginTop: 8, marginLeft: 60 }}>+ {item.items.length - 3} sản phẩm khác</Text>
                    )}
                </View>
                <Text style={styles.total}>Tổng: {Number(item.total || 0).toLocaleString('vi-VN')} VND</Text>
                <Text style={styles.small}>Địa chỉ: {item.address}</Text>
                <Text style={styles.small}>Phương thức: {item.payment}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                    <TouchableOpacity onPress={() => router.push(`/order/${item.id || item._id}` as any)} style={[styles.actionBtn, { backgroundColor: '#111827' }]}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Xem chi tiết</Text>
                    </TouchableOpacity>
                    {status === 'Đã giao hàng' && (
                        <TouchableOpacity
                            onPress={() => handleReviewPress(item)}
                            style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Đánh giá</Text>
                        </TouchableOpacity>
                    )}
                    {status !== 'Đã hủy' && status !== 'Đã giao hàng' && (
                        <TouchableOpacity
                            onPress={() => Alert.alert('Xác nhận', 'Bạn có chắc muốn hủy đơn hàng này?', [
                                { text: 'Không', style: 'cancel' },
                                { text: 'Có, hủy', style: 'destructive', onPress: () => handleCancel(item.id || item._id, item._id) }
                            ])}
                            style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Hủy đơn</Text>
                        </TouchableOpacity>
                    )}
                    {status === 'Đã hủy' && (
                        <TouchableOpacity
                            onPress={async () => {
                                Alert.alert('Xóa đơn', 'Xóa vĩnh viễn đơn hàng này?', [
                                    { text: 'Không', style: 'cancel' },
                                    {
                                        text: 'Xóa', style: 'destructive', onPress: async () => {
                                            const userString = await AsyncStorage.getItem('user');
                                            const user = userString ? JSON.parse(userString) : null;
                                            if (!user || !user._id) return;
                                            // Try delete on backend if _id exists
                                            if (item._id) {
                                                try { await fetch(`${BASE_URL}/orders/${item._id}`, { method: 'DELETE' }); } catch { }
                                            }
                                            const historyKey = `order_history_${user._id}`;
                                            const historyString = await AsyncStorage.getItem(historyKey);
                                            let history = historyString ? JSON.parse(historyString) : [];
                                            history = Array.isArray(history) ? history : [];
                                            history = history.filter((o: any) => (o.id || o._id) !== (item.id || item._id));
                                            await AsyncStorage.setItem(historyKey, JSON.stringify(history));
                                            setOrders((prev) => prev.filter((o: any) => (o.id || o._id) !== (item.id || item._id)));
                                        }
                                    }
                                ]);
                            }}
                            style={[styles.actionBtn, { backgroundColor: '#6b7280' }]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Xóa đơn</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const tabs = useMemo(() => ['Tất cả', ...STATUS_ORDER, 'Đã hủy'], []);

    const filteredOrders = useMemo(() => {
        if (activeTab === 'Tất cả') return orders;
        return orders.filter((o) => normalizeStatus(o.status) === activeTab);
    }, [orders, activeTab]);

    const emptyComponent = useMemo(() => (
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 80 }}>Chưa có đơn hàng</Text>
    ), []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
            <View style={{ padding: 13 }}>
                <Text style={{ fontSize: 21, fontWeight: 'bold', marginBottom: 9, color: '#222' }}>Đơn hàng của tôi</Text>
                {/* Horizontal status tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row' }}>
                        {tabs.map((t) => {
                            const isActive = activeTab === t;
                            const info = STATUS_INFO[t] || { color: '#111827', emoji: '' };
                            return (
                                <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tabChip, isActive ? { backgroundColor: info.color } : null]}>
                                    <Text style={[styles.tabText, isActive ? { color: '#fff' } : null]}>
                                        {STATUS_INFO[t]?.emoji ? `${STATUS_INFO[t].emoji} ` : ''}{t}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => (item.id || item._id || Math.random()).toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={emptyComponent}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    ListFooterComponent={<View style={{ height: 12 }} />}
                    showsVerticalScrollIndicator={false}
                />
            </View>
            {/* Modal chi tiết đã chuyển sang màn riêng /order/[id] */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    date: { color: '#555', fontWeight: 'bold' },
    badge: { fontWeight: 'bold' },
    total: { fontWeight: 'bold', color: '#ef233c', marginTop: 6 },
    small: { color: '#888', fontSize: 13, marginTop: 2 },
    actionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginRight: 10, marginBottom: 8 },
    // Stepper
    stepperWrap: { marginTop: 8, marginBottom: 4 },
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    stepEmoji: { fontSize: 13 },
    stepLineFlex: { height: 3, flex: 1, marginHorizontal: 8, borderRadius: 2 },
    stepLabelsRow: { flexDirection: 'row', marginTop: 6 },
    stepLabelFlex: { flex: 1, textAlign: 'center', fontSize: 12, color: '#666' },
    cancelWrap: { backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 6, marginBottom: 6 },
    cancelText: { color: '#ef4444', fontWeight: 'bold' },
    // Tabs
    tabChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#f3f4f6', marginRight: 8 },
    tabText: { color: '#111827', fontWeight: '600' },
    // Product images
    productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
    productName: { fontSize: 14, fontWeight: '600', color: '#222' },
    productMeta: { fontSize: 12, color: '#666', marginTop: 2 },
    productPrice: { fontSize: 14, fontWeight: '600', color: '#222' },
});


