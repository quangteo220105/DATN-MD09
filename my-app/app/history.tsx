import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
    const [orders, setOrders] = useState([]);
    const router = useRouter();

    const STATUS_INFO = {
        'Chờ xác nhận': {
            emoji: '🛒',
            color: '#0ea5e9',
            bg: '#e0f2fe',
            meaning: 'Người dùng vừa đặt hàng xong, hệ thống ghi nhận đơn',
            changer: 'Hệ thống tự động'
        },
        'Đã xác nhận': {
            emoji: '📦',
            color: '#22c55e',
            bg: '#dcfce7',
            meaning: 'Quản trị viên duyệt đơn, chuẩn bị hàng',
            changer: 'Quản trị viên'
        },
        'Đang giao hàng': {
            emoji: '🚚',
            color: '#f59e0b',
            bg: '#fef3c7',
            meaning: 'Đơn hàng đã được giao cho đơn vị vận chuyển',
            changer: 'Quản trị viên'
        },
        'Đã giao hàng': {
            emoji: '✅',
            color: '#16a34a',
            bg: '#dcfce7',
            meaning: 'Người dùng đã nhận hàng thành công',
            changer: 'Quản trị viên hoặc người dùng xác nhận'
        },
        'Đã hủy': {
            emoji: '❌',
            color: '#ef4444',
            bg: '#fee2e2',
            meaning: 'Người dùng hoặc admin hủy đơn',
            changer: 'Cả hai bên'
        }
    } as const;

    const normalizeStatus = (raw) => {
        if (!raw) return 'Chờ xác nhận';
        const s = String(raw).trim();
        if (s === 'Đang xử lý' || s.toLowerCase() === 'pending') return 'Chờ xác nhận';
        if (s.toLowerCase() === 'confirmed') return 'Đã xác nhận';
        if (s.toLowerCase() === 'shipping' || s === 'Đang vận chuyển') return 'Đang giao hàng';
        if (s.toLowerCase() === 'delivered') return 'Đã giao hàng';
        if (s.toLowerCase() === 'cancelled' || s.toLowerCase() === 'canceled') return 'Đã hủy';
        // If it already matches one of our VN labels, keep it
        if (STATUS_INFO[s]) return s;
        return 'Chờ xác nhận';
    };

    const renderStatus = (status) => {
        const key = normalizeStatus(status);
        const info = STATUS_INFO[key];
        return (
            <View style={[styles.statusWrap, { backgroundColor: info.bg }]}>                
                <Text style={[styles.statusText, { color: info.color }]}>
                    {info.emoji} {key}
                </Text>
                <Text style={styles.statusSmall}>
                    {info.meaning} • {info.changer}
                </Text>
            </View>
        );
    };

    useEffect(() => {
        const fetchOrders = async () => {
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
            setOrders(history);
        };
        fetchOrders();
    }, []);

    const renderItem = ({ item }) => (
        <View style={styles.orderCard}>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
            {renderStatus(item.status)}
            <FlatList
                data={item.items}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text>{item.name} ({item.size}, {item.color}) x{item.qty}</Text>
                        <Text>{(item.price * item.qty).toLocaleString('vi-VN')} VND</Text>
                    </View>
                )}
                style={{ marginVertical: 6 }}
            />
            <Text style={{ fontWeight: 'bold', color: '#ef233c' }}>Tổng: {item.total.toLocaleString('vi-VN')} VND</Text>
            <Text style={styles.small}>Địa chỉ: {item.address}</Text>
            <Text style={styles.small}>Phương thức: {item.payment}</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
            <View style={{ padding: 13 }}>
                <Text style={{ fontSize: 21, fontWeight: 'bold', marginBottom: 9, color: '#222' }}>Lịch sử đơn hàng</Text>
                <FlatList
                    data={orders}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 80 }}>Chưa có đơn hàng</Text>}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    orderCard: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    date: { color: '#555', fontWeight: 'bold' },
    statusWrap: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 6, marginBottom: 6 },
    statusText: { fontWeight: 'bold' },
    statusSmall: { color: '#555', fontSize: 12, marginTop: 2 },
    small: { color: '#888', fontSize: 13, marginTop: 2 }
});
