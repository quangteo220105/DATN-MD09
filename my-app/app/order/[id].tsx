import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { DOMAIN, BASE_URL } from '../../config/apiConfig';

const STATUS_ORDER = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng'] as const;

const STATUS_INFO: Record<string, { emoji: string; color: string }> = {
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
    if (s.toLowerCase() === 'confirmed') return 'Đã xác nhận';
    if (s.toLowerCase() === 'shipping' || s === 'Đang vận chuyển') return 'Đang giao hàng';
    if (s.toLowerCase() === 'delivered') return 'Đã giao hàng';
    if (s.toLowerCase() === 'cancelled' || s.toLowerCase() === 'canceled') return 'Đã hủy';
    return STATUS_INFO[s] ? s : 'Chờ xác nhận';
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [order, setOrder] = useState<any | null>(null);

    const loadOrder = async () => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) {
            router.replace('/(tabs)/login');
            return;
        }
        const historyKey = `order_history_${user._id}`;
        const historyString = await AsyncStorage.getItem(historyKey);
        let history = historyString ? JSON.parse(historyString) : [];
        history = Array.isArray(history) ? history : [];
        let found = history.find((o: any) => String(o.id || o._id) === String(id));
        if (!found) {
            // Try fetch from backend when not found locally
            try {
                const res = await fetch(`${DOMAIN}/api/orders/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && (data._id || data.id)) {
                        found = data;
                    }
                }
            } catch {}
        }
        setOrder(found || null);
    };

    useEffect(() => { loadOrder(); }, [id]);
    useFocusEffect(React.useCallback(() => { loadOrder(); }, [id]));

    const status = normalizeStatus(order?.status);
    const created = order?.createdAt ? new Date(order.createdAt).toLocaleString() : '';

    const currentIndex = useMemo(() => Math.max(0, STATUS_ORDER.indexOf(status as any)), [status]);

    const handleCancel = () => {
        if (!order) return;
        if (status === 'Đã giao hàng' || status === 'Đã hủy') return;
        Alert.alert('Xác nhận', 'Bạn có chắc muốn hủy đơn hàng này?', [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Có, hủy', style: 'destructive', onPress: async () => {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (!user || !user._id) return;
                    const historyKey = `order_history_${user._id}`;
                    const historyString = await AsyncStorage.getItem(historyKey);
                    let history = historyString ? JSON.parse(historyString) : [];
                    history = Array.isArray(history) ? history : [];
                    // Try backend if id looks like ObjectId or order has _id
                    const backendId = order._id || (String(id).length === 24 ? id : null);
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
                    history = history.map((o: any) => (String(o.id || o._id) === String(id) ? { ...o, status: 'Đã hủy' } : o));
                    await AsyncStorage.setItem(historyKey, JSON.stringify(history));
                    const updated = history.find((o: any) => String(o.id || o._id) === String(id));
                    setOrder(updated || null);
                }
            }
        ]);
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
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.orderCode}>Mã đơn: {String(order.id || order._id)}</Text>
                        <Text style={styles.meta}>Ngày tạo: {created}</Text>
                    </View>
                    <View style={[styles.statusPill, { borderColor: STATUS_INFO[status].color }]}>
                        <Text style={[styles.statusBadge, { color: STATUS_INFO[status].color }]} numberOfLines={1}>
                            {STATUS_INFO[status].emoji} {status}
                        </Text>
                    </View>
                </View>

                {/* Stepper */}
                {status === 'Đã hủy' ? (
                    <View style={styles.cancelWrap}>
                        <Text style={styles.cancelText}>{STATUS_INFO['Đã hủy'].emoji} Đã hủy</Text>
                    </View>
                ) : (
                    <View style={styles.stepperWrap}>
                        {STATUS_ORDER.map((step, i) => {
                            const active = i <= currentIndex;
                            const isLast = i === STATUS_ORDER.length - 1;
                            return (
                                <View key={step} style={styles.stepItem}>
                                    <View style={[styles.stepCircle, active ? { backgroundColor: STATUS_INFO[step].color } : { backgroundColor: '#e5e7eb' }]}>
                                        <Text style={styles.stepEmoji}>{STATUS_INFO[step].emoji}</Text>
                                    </View>
                                    {!isLast && (
                                        <View style={[styles.stepLine, active ? { backgroundColor: STATUS_INFO[step].color } : { backgroundColor: '#e5e7eb' }]} />
                                    )}
                                    <Text style={[styles.stepLabel, active ? { color: STATUS_INFO[step].color } : null]} numberOfLines={1}>{step}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Address & payment */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
                    <Text style={styles.text}>{order.address}</Text>
                    <Text style={[styles.text, { marginTop: 6 }]}>Phương thức thanh toán: {order.payment}</Text>
                </View>

                {/* Items */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sản phẩm</Text>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((it: any, idx: number) => (
                            <View key={idx} style={styles.itemRow}>
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
                                <Text style={styles.itemPrice}>{((it.price || 0) * (it.qty || 0)).toLocaleString('vi-VN')} VND</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.text}>Không có sản phẩm.</Text>
                    )}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10, paddingTop: 10 }}>
                        <Text style={{ fontWeight: 'bold', color: '#ef233c', textAlign: 'right' }}>Tổng cộng: {Number(order.total || 0).toLocaleString('vi-VN')} VND</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: '#111827' }]}>
                        <Text style={styles.actionText}>Quay lại</Text>
                    </TouchableOpacity>
                    {status !== 'Đã giao hàng' && status !== 'Đã hủy' && (
                        <TouchableOpacity onPress={handleCancel} style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}>
                            <Text style={styles.actionText}>Hủy đơn</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
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
    stepperWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 12 },
    stepItem: { flexDirection: 'column', alignItems: 'center', flex: 1 },
    stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    stepEmoji: { fontSize: 14 },
    stepLine: { height: 3, width: '100%', marginHorizontal: 6, marginTop: 14 },
    stepLabel: { fontSize: 11, marginTop: 6, color: '#666' },
    cancelWrap: { backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 12 },
    cancelText: { color: '#ef4444', fontWeight: 'bold' },
    // Actions
    actionBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
    actionText: { color: '#fff', fontWeight: '600' },
});


