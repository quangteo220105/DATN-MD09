import { useRouter } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../../config/apiConfig';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(0|\+84)\d{9}$/;

const RegisterScreen = () => {
    const router = useRouter();

    // ✅ Clear user cũ khi vào màn đăng ký để tránh bị redirect bởi logic check user
    useEffect(() => {
        const clearOldUser = async () => {
            try {
                // Chỉ clear nếu user đã bị xóa (check trên server)
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    const userId = user?._id || user?.id;
                    if (userId) {
                        try {
                            // Kiểm tra xem user còn tồn tại không
                            await axios.get(`${BASE_URL}/users/${userId}`);
                            // Nếu user còn tồn tại, không clear (để user có thể đăng nhập)
                        } catch (err: any) {
                            // Nếu user không tồn tại (404) hoặc lỗi khác, clear user cũ
                            if (err?.response?.status === 404) {
                                console.log('Clearing deleted user from storage...');
                                await AsyncStorage.removeItem('user');
                            }
                        }
                    }
                }
            } catch (error) {
                // Ignore errors when clearing
                console.log('Error clearing old user:', error);
            }
        };
        clearOldUser();
    }, []);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);

    const [touched, setTouched] = useState({
        name: false,
        phone: false,
        email: false,
        password: false,
    });

    const nameValid = useMemo(() => name.trim().length > 1, [name]);
    const phoneValid = useMemo(() => phoneRegex.test(phone), [phone]);
    const emailValid = useMemo(() => emailRegex.test(email), [email]);
    const passwordValid = useMemo(() => password.length >= 6, [password]);

    const canSubmit = nameValid && phoneValid && emailValid && passwordValid;

    const pickImage = async () => {
        try {
            // Yêu cầu quyền truy cập thư viện ảnh
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert("Cần quyền truy cập", "Ứng dụng cần quyền truy cập thư viện ảnh để chọn avatar!");
                return;
            }

            // Hiển thị menu lựa chọn
            Alert.alert(
                "Chọn ảnh avatar",
                "Bạn muốn chọn ảnh như thế nào?",
                [
                    {
                        text: "Chọn ảnh (không crop)",
                        onPress: async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: false,
                                quality: 0.8,
                                allowsMultipleSelection: false,
                                exif: false,
                            });

                            if (!result.canceled && result.assets[0]) {
                                setAvatar(result.assets[0].uri);
                                Alert.alert("Thành công", "Đã chọn ảnh avatar thành công!");
                            }
                        }
                    },
                    {
                        text: "Chọn ảnh (có crop)",
                        onPress: async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                aspect: [1, 1],
                                quality: 0.8,
                                allowsMultipleSelection: false,
                                exif: false,
                            });

                            if (!result.canceled && result.assets[0]) {
                                setAvatar(result.assets[0].uri);
                                Alert.alert("Thành công", "Đã chọn ảnh avatar thành công!");
                            }
                        }
                    },
                    {
                        text: "Hủy",
                        style: "cancel"
                    }
                ]
            );
        } catch (error) {
            console.error('Lỗi chọn ảnh:', error);
            Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại!");
        }
    };

    const handleRegister = async () => {
        if (!canSubmit) return;
        setLoading(true);

        try {
            // Tạo FormData để gửi file
            const formData = new FormData();
            formData.append('name', name);
            formData.append('phone', phone);
            formData.append('email', email);
            formData.append('password', password);

            if (avatar) {
                formData.append('avatar', {
                    uri: avatar,
                    type: 'image/jpeg',
                    name: 'avatar.jpg',
                } as any);
            }

            const response = await axios.post(`${BASE_URL}/auth/register`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Lưu thông tin user vào AsyncStorage nếu có
            if (response.data.user) {
                let fixedUser = { ...response.data.user };
                if (!fixedUser._id) {
                    fixedUser._id = fixedUser.id || fixedUser.userId || '';
                }
                await AsyncStorage.setItem('user', JSON.stringify(fixedUser));
                console.log('User saved to AsyncStorage after registration:', fixedUser);
                alert(response.data.message);
                router.replace('/(tabs)/login');
            } else {
                alert(response.data.message);
                router.push('/(tabs)/login');
            }
        } catch (error: any) {
            if (error.response) {
                alert(error.response.data.message);
            } else {
                alert('Có lỗi xảy ra. Vui lòng thử lại!');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        <View style={styles.card}>
                            <Text style={styles.title}>Đăng ký</Text>
                            <Text style={styles.subtitle}>Tạo tài khoản mới của bạn</Text>

                            {/* Họ tên */}
                            <View style={styles.inputContainer}>
                                <View
                                    style={[
                                        styles.inputWrapper,
                                        touched.name && !nameValid && { borderColor: '#ff4d4f', borderWidth: 2 },
                                        name.length > 0 && nameValid && { borderColor: '#30c48d', borderWidth: 2 },
                                    ]}
                                >
                                    <Ionicons name="person-outline" size={20} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Họ và tên"
                                        placeholderTextColor="#999"
                                        value={name}
                                        onChangeText={setName}
                                        onBlur={() => setTouched(t => ({ ...t, name: true }))}
                                    />
                                    {name.length > 0 && (
                                        <Ionicons
                                            name={nameValid ? 'checkmark-circle' : 'alert-circle'}
                                            size={22}
                                            color={nameValid ? '#30c48d' : '#ff4d4f'}
                                        />
                                    )}
                                </View>
                                {touched.name && !nameValid && (
                                    <Text style={styles.error}>Vui lòng nhập tên hợp lệ</Text>
                                )}
                            </View>

                            {/* Số điện thoại */}
                            <View style={styles.inputContainer}>
                                <View
                                    style={[
                                        styles.inputWrapper,
                                        touched.phone && !phoneValid && { borderColor: '#ff4d4f', borderWidth: 2 },
                                        phone.length > 0 && phoneValid && { borderColor: '#30c48d', borderWidth: 2 },
                                    ]}
                                >
                                    <Ionicons name="call-outline" size={20} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Số điện thoại"
                                        placeholderTextColor="#999"
                                        keyboardType="phone-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                        onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                                    />
                                    {phone.length > 0 && (
                                        <Ionicons
                                            name={phoneValid ? 'checkmark-circle' : 'alert-circle'}
                                            size={22}
                                            color={phoneValid ? '#30c48d' : '#ff4d4f'}
                                        />
                                    )}
                                </View>
                                {touched.phone && !phoneValid && (
                                    <Text style={styles.error}>Số điện thoại không hợp lệ</Text>
                                )}
                            </View>

                            {/* Email */}
                            <View style={styles.inputContainer}>
                                <View
                                    style={[
                                        styles.inputWrapper,
                                        touched.email && !emailValid && { borderColor: '#ff4d4f', borderWidth: 2 },
                                        email.length > 0 && emailValid && { borderColor: '#30c48d', borderWidth: 2 },
                                    ]}
                                >
                                    <Ionicons name="mail-outline" size={20} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email"
                                        placeholderTextColor="#999"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                        onBlur={() => setTouched(t => ({ ...t, email: true }))}
                                    />
                                    {email.length > 0 && (
                                        <Ionicons
                                            name={emailValid ? 'checkmark-circle' : 'alert-circle'}
                                            size={22}
                                            color={emailValid ? '#30c48d' : '#ff4d4f'}
                                        />
                                    )}
                                </View>
                                {touched.email && !emailValid && (
                                    <Text style={styles.error}>Vui lòng nhập đúng định dạng email</Text>
                                )}
                            </View>

                            {/* Mật khẩu */}
                            <View style={styles.inputContainer}>
                                <View
                                    style={[
                                        styles.inputWrapper,
                                        touched.password && !passwordValid && { borderColor: '#ff4d4f', borderWidth: 2 },
                                        password.length > 0 && passwordValid && { borderColor: '#30c48d', borderWidth: 2 },
                                    ]}
                                >
                                    <Ionicons name="lock-closed-outline" size={20} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Mật khẩu"
                                        placeholderTextColor="#999"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                        onBlur={() => setTouched(t => ({ ...t, password: true }))}
                                    />
                                    <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeIcon}>
                                        <Ionicons 
                                            name={showPassword ? 'eye' : 'eye-off'} 
                                            size={22} 
                                            color="#667eea" 
                                        />
                                    </Pressable>
                                    {password.length > 0 && (
                                        <Ionicons
                                            name={passwordValid ? 'checkmark-circle' : 'alert-circle'}
                                            size={22}
                                            color={passwordValid ? '#30c48d' : '#ff4d4f'}
                                            style={{ marginLeft: 8 }}
                                        />
                                    )}
                                </View>
                                {touched.password && !passwordValid && (
                                    <Text style={styles.error}>Mật khẩu phải có ít nhất 6 ký tự</Text>
                                )}
                            </View>

                            {/* Avatar Selection */}
                            <View style={styles.avatarSection}>
                                <Text style={styles.avatarLabel}>Ảnh đại diện (tùy chọn)</Text>
                                <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                                    {avatar ? (
                                        <View style={styles.avatarImageWrapper}>
                                            <Image source={{ uri: avatar }} style={styles.avatarImage} />
                                            <View style={styles.avatarEditBadge}>
                                                <Ionicons name="camera" size={16} color="#fff" />
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="camera-outline" size={40} color="#667eea" />
                                            <Text style={styles.avatarPlaceholderText}>Chọn ảnh</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Nút đăng ký */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                disabled={!canSubmit || loading}
                                onPress={handleRegister}
                                style={[
                                    styles.button,
                                    (!canSubmit || loading) && styles.buttonDisabled
                                ]}
                            >
                                {loading ? (
                                    <LinearGradient
                                        colors={['#667eea', '#764ba2']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.buttonGradient}
                                    >
                                        <ActivityIndicator color="#fff" />
                                    </LinearGradient>
                                ) : (
                                    <LinearGradient
                                        colors={canSubmit ? ['#667eea', '#764ba2'] : ['#b5b5b5', '#999']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.buttonGradient}
                                    >
                                        <Text style={styles.buttonText}>Đăng ký</Text>
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>

                            {/* Chuyển sang đăng nhập */}
                            <View style={styles.loginPrompt}>
                                <Text style={styles.normalText}>Đã có tài khoản?</Text>
                                <TouchableOpacity onPress={() => router.push('/(tabs)/login')}>
                                    <Text style={styles.registerLink}> Đăng nhập</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

export default RegisterScreen;

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 20,
    },
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#1a1a1a',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#f8f9fa',
        minHeight: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1a1a1a',
    },
    eyeIcon: {
        marginRight: 8,
        padding: 4,
    },
    button: {
        borderRadius: 12,
        marginTop: 8,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    error: {
        color: '#ff4d4f',
        fontSize: 13,
        marginTop: 6,
        marginLeft: 4,
    },
    avatarSection: {
        marginBottom: 20,
        marginTop: 8,
    },
    avatarLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#1a1a1a',
        textAlign: 'center',
    },
    avatarContainer: {
        alignSelf: 'center',
    },
    avatarImageWrapper: {
        position: 'relative',
    },
    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#667eea',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#667eea',
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#667eea',
        borderStyle: 'dashed',
    },
    avatarPlaceholderText: {
        marginTop: 8,
        color: '#667eea',
        fontSize: 14,
        fontWeight: '500',
    },
    loginPrompt: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    normalText: {
        color: '#666',
        fontSize: 15,
    },
    registerLink: {
        color: '#667eea',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
