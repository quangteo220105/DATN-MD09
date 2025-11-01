import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { DOMAIN } from '../config/apiConfig';

export default function SettingsScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const u = await AsyncStorage.getItem('user');
                if (u) setUser(JSON.parse(u));
            } catch { }
        };
        load();
    }, []);

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('user');
        } catch { }
        router.replace('/(tabs)/login');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={{ padding: 16 }}>
                <View style={styles.profileCard}>
                    {user?.avatar ? (
                        <Image source={{ uri: `${DOMAIN}${user.avatar}` }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={28} color="#666" />
                        </View>
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.name}>{user?.name || 'Người dùng'}</Text>
                        {!!user?.email && <Text style={styles.sub}>{user.email}</Text>}
                        {!!user?.phone && <Text style={styles.sub}>{user.phone}</Text>}
                    </View>
                </View>

                <View style={styles.section}>
                    <SettingsItem icon="key-outline" title="Đổi mật khẩu" onPress={() => Alert.alert('Thông báo', 'Tính năng sẽ có sớm.')} />
                    <SettingsItem icon="chatbubbles-outline" title="Hỗ trợ" onPress={() => router.push('/chat')} />
                    <SettingsItem icon="cube-outline" title="Đơn hàng của tôi" onPress={() => router.push('/orders')} />
                </View>

                <View style={styles.section}>
                    <SettingsItem icon="log-out-outline" title="Đăng xuất" danger onPress={logout} />
                </View>
            </View>
        </SafeAreaView>
    );
}

function SettingsItem({ icon, title, onPress, danger }: { icon: any; title: string; onPress: () => void; danger?: boolean }) {
    return (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <View style={styles.itemLeft}>
                <Ionicons name={icon} size={22} color={danger ? '#ef4444' : '#222'} />
                <Text style={[styles.itemText, danger && { color: '#ef4444' }]}>{title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2
    },
    avatar: { width: 60, height: 60, borderRadius: 30 },
    avatarPlaceholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 18, fontWeight: 'bold', color: '#222' },
    sub: { color: '#666', marginTop: 2 },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#eee'
    },
    item: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#f2f2f2'
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemText: { fontSize: 15, color: '#222', fontWeight: '600' }
});


