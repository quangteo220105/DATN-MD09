import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { BASE_URL, DOMAIN } from '../config/apiConfig';

const phoneRegex = /^(0|\+84)\d{9}$/;

export default function ProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUploading, setAvatarUploading] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const u = JSON.parse(userData);
                    setUser(u);
                    setName(u.name || '');
                    setPhone(u.phone || '');
                    setEmail(u.email || '');
                }
            } catch (error) {
                console.error('Error loading user:', error);
            }
        };
        loadUser();
    }, []);

    const resolveAvatarUri = (avatarPath?: string | null) => {
        if (!avatarPath) return null;
        if (avatarPath.startsWith('http')) return avatarPath;
        const base = DOMAIN.replace(/\/$/, '');
        return `${base}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`;
    };

    const onPickAvatar = async () => {
        try {
            if (!user) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!');
                return;
            }
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để đổi avatar.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.85,
                allowsMultipleSelection: false,
                exif: false,
            });
            if (result.canceled || !result.assets?.length) return;
            const asset = result.assets[0];
            if (!asset?.uri) return;

            setAvatarUploading(true);
            const form = new FormData();
            form.append('userId', user.id || user._id);
            const filename = asset.fileName || `avatar_${Date.now()}.jpg`;
            const mime = asset.mimeType || 'image/jpeg';
            // @ts-ignore RN FormData file
            form.append('avatar', { uri: asset.uri, name: filename, type: mime });

            const res = await axios.put(`${BASE_URL}/auth/update-avatar`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const updated = {
                ...user,
                avatar: res.data?.user?.avatar || user.avatar,
            };
            setUser(updated);
            await AsyncStorage.setItem('user', JSON.stringify(updated));
            Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện.');
        } catch (e: any) {
            console.error('upload avatar error', e);
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể cập nhật avatar, vui lòng thử lại!');
        } finally {
            setAvatarUploading(false);
        }
    };

    const avatarUri = resolveAvatarUri(user?.avatar);

    const handleUpdate = async () => {
        // Validate
        if (!name.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên!');
            return;
        }

        if (!phone.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại!');
            return;
        }

        if (!phoneRegex.test(phone)) {
            Alert.alert('Lỗi', 'Số điện thoại không hợp lệ!');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.put(`${BASE_URL}/auth/update-profile`, {
                userId: user.id || user._id,
                name: name.trim(),
                phone: phone.trim()
            });

            // Cập nhật thông tin user trong AsyncStorage
            const updatedUser = {
                ...user,
                name: response.data.user.name,
                phone: response.data.user.phone
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            Alert.alert('Thành công', 'Cập nhật thành công!');
            router.back();
        } catch (error: any) {
            console.error('Update error:', error);
            if (error.response) {
                Alert.alert('Lỗi', error.response.data.message);
            } else {
                Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại!');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={styles.container}>
                <View style={styles.form}>
                    <View style={styles.avatarWrap}>
                        <Image
                            source={avatarUri ? { uri: avatarUri } : require('../assets/images/icon.png')}
                            style={styles.avatar}
                            contentFit="cover"
                        />
                        <TouchableOpacity onPress={onPickAvatar} style={styles.avatarBtn} disabled={avatarUploading}>
                            {avatarUploading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="camera" size={16} color="#fff" />
                                    <Text style={styles.avatarBtnText}>Đổi ảnh</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tên</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Nhập tên của bạn"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={email}
                            editable={false}
                            placeholderTextColor="#999"
                        />
                        <Text style={styles.note}>Email không thể thay đổi</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Số điện thoại</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Nhập số điện thoại"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.updateButton, loading && styles.updateButtonDisabled]}
                        onPress={handleUpdate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.updateButtonText}>Cập nhật</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222'
    },
    container: {
        flex: 1,
        padding: 16
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2
    },
    avatarWrap: {
        alignItems: 'center',
        marginBottom: 16
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#eee',
        borderWidth: 1,
        borderColor: '#ddd'
    },
    avatarBtn: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#007bff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20
    },
    avatarBtnText: {
        color: '#fff',
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '600'
    },
    inputGroup: {
        marginBottom: 20
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
        marginBottom: 8
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: '#fff',
        color: '#222'
    },
    disabledInput: {
        backgroundColor: '#f5f5f5',
        color: '#666'
    },
    note: {
        fontSize: 12,
        color: '#999',
        marginTop: 4
    },
    updateButton: {
        backgroundColor: '#007bff',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    updateButtonDisabled: {
        backgroundColor: '#999'
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    }
});

