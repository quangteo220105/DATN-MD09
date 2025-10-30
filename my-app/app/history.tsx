import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
    const [orders, setOrders] = useState([]);
    const router = useRouter();

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
            <Text style={styles.status}>{item.status || '...'}</Text>
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
    date: { color: '#5f6', fontWeight: 'bold' },
    status: { color: '#409cff', marginBottom: 2, fontWeight: 'bold', marginTop: 2 },
    small: { color: '#888', fontSize: 13, marginTop: 2 }
});
