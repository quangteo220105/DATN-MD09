import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { DOMAIN, BASE_URL } from '../config/apiConfig';

export default function SettingsScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showChangePassword, setShowChangePassword] = useState(false);

    const loadUser = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
        } catch { }
    };

    useEffect(() => {
        loadUser();
    }, []);

    // Cập nhật user data khi màn hình được focus (quay lại từ profile)
    useFocusEffect(
        React.useCallback(() => {
            loadUser();
        }, [])
    );

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('user');
        } catch { }
        router.replace('/(tabs)/login');
    };

    const handleOpenChangePassword = () => {
        setShowChangePassword(true);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={{ padding: 16 }}>
                <TouchableOpacity
                    style={styles.profileCard}
                    onPress={() => router.push('/profile')}
                    activeOpacity={0.7}
                >
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
                </TouchableOpacity>

                <View style={styles.section}>
                    <SettingsItem icon="key-outline" title="Đổi mật khẩu" onPress={handleOpenChangePassword} />
                    <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                        <View style={{ backgroundColor: '#e6f7ff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#bae7ff' }}>
                            <Text style={{ color: '#0958d9', fontSize: 13 }}>
                                Lưu ý: Mật khẩu mới cần tối thiểu 6 ký tự và khác mật khẩu cũ.
                            </Text>
                        </View>
                    </View>
                    <SettingsItem icon="notifications-outline" title="Thông báo" onPress={() => router.push('/notifications')} />
                    <SettingsItem icon="chatbubbles-outline" title="Hỗ trợ tư vấn" onPress={() => router.push('/chat')} />
                    <SettingsItem icon="sparkles-outline" title="Chat với AI tư vấn" onPress={() => router.push('/chatAI')} />
                    <SettingsItem icon="cube-outline" title="Đơn hàng của tôi" onPress={() => router.push('/orders')} />
                </View>

                <View style={styles.section}>
                    <SettingsItem icon="log-out-outline" title="Đăng xuất" danger onPress={logout} />
                </View>
            </View>

            {/* Dialog đổi mật khẩu */}
            <ChangePasswordDialog
                visible={showChangePassword}
                onClose={() => setShowChangePassword(false)}
                userId={user?.id || user?._id}
                router={router}
            />
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
    itemText: { fontSize: 15, color: '#222', fontWeight: '600' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#222'
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#222'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15
    },
    forgotPasswordButton: {
        marginTop: 8,
        alignSelf: 'flex-end'
    },
    forgotPasswordText: {
        fontSize: 13,
        color: '#007bff'
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    modalButtonSecondary: {
        backgroundColor: '#f0f0f0'
    },
    modalButtonPrimary: {
        backgroundColor: '#007bff'
    },
    modalButtonText: {
        fontSize: 15,
        fontWeight: '600'
    },
    modalButtonTextSecondary: {
        color: '#222'
    },
    modalButtonTextPrimary: {
        color: '#fff'
    }
});

function ChangePasswordDialog({ visible, onClose, userId, router }: { visible: boolean; onClose: () => void; userId: string; router: any }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin!');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới không khớp!');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!');
            return;
        }

        setLoading(true);
        try {
            await axios.put(`${BASE_URL}/auth/change-password`, {
                userId,
                oldPassword,
                newPassword
            });

            Alert.alert('Thành công', 'Đổi mật khẩu thành công!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onClose();
        } catch (error: any) {
            if (error.response) {
                Alert.alert('Lỗi', error.response.data.message);
            } else {
                Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại!');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        onClose();
        router.push('/changePassword');
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu cũ</Text>
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                style={styles.input}
                                value={oldPassword}
                                onChangeText={setOldPassword}
                                placeholder="Nhập mật khẩu cũ"
                                secureTextEntry={!showOldPassword}
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 12, top: 12 }}
                                onPress={() => setShowOldPassword(!showOldPassword)}
                            >
                                <Ionicons name={showOldPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu mới</Text>
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Nhập mật khẩu mới"
                                secureTextEntry={!showNewPassword}
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 12, top: 12 }}
                                onPress={() => setShowNewPassword(!showNewPassword)}
                            >
                                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Nhập lại mật khẩu mới"
                                secureTextEntry={!showConfirmPassword}
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 12, top: 12 }}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
                        <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonSecondary]}
                            onPress={onClose}
                        >
                            <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonPrimary]}
                            onPress={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Đổi mật khẩu</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}


