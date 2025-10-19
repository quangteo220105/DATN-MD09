import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Image,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../../config/apiConfig';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(0|\+84)\d{9}$/;

const RegisterScreen = () => {
    const router = useRouter();

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
                await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
                console.log('User saved to AsyncStorage after registration:', response.data.user);
                alert(response.data.message);
                router.replace('/(tabs)/home'); // Chuyển thẳng đến Home thay vì Login
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
        <View style={styles.container}>
            <Text style={styles.title}>Đăng ký</Text>
            {/* Họ tên */}
            <View
                style={[
                    styles.inputWrapper,
                    touched.name && !nameValid && { borderColor: '#ff4d4f' },
                    nameValid && { borderColor: '#000' },
                ]}
            >
                <TextInput
                    style={styles.input}
                    placeholder="Họ và tên"
                    placeholderTextColor="#aaa"
                    value={name}
                    onChangeText={setName}
                    onBlur={() => setTouched(t => ({ ...t, name: true }))}
                />
                {name.length > 0 && (
                    <Ionicons
                        name={nameValid ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                        size={22}
                        color={nameValid ? '#000' : '#ff4d4f'}
                    />
                )}
            </View>
            {touched.name && !nameValid && (
                <Text style={styles.error}>Vui lòng nhập tên hợp lệ</Text>
            )}

            {/* Số điện thoại */}
            <View
                style={[
                    styles.inputWrapper,
                    touched.phone && !phoneValid && { borderColor: '#ff4d4f' },
                    phoneValid && { borderColor: '#000' },
                ]}
            >
                <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    placeholderTextColor="#aaa"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                />
                {phone.length > 0 && (
                    <Ionicons
                        name={phoneValid ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                        size={22}
                        color={phoneValid ? '#000' : '#ff4d4f'}
                    />
                )}
            </View>
            {touched.phone && !phoneValid && (
                <Text style={styles.error}>Số điện thoại không hợp lệ</Text>
            )}

            {/* Email */}
            <View
                style={[
                    styles.inputWrapper,
                    touched.email && !emailValid && { borderColor: '#ff4d4f' },
                    emailValid && { borderColor: '#000' },
                ]}
            >
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#aaa"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => setTouched(t => ({ ...t, email: true }))}
                />
                {email.length > 0 && (
                    <Ionicons
                        name={emailValid ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                        size={22}
                        color={emailValid ? '#000' : '#ff4d4f'}
                    />
                )}
            </View>
            {touched.email && !emailValid && (
                <Text style={styles.error}>Vui lòng nhập đúng định dạng email</Text>
            )}

            {/* Mật khẩu */}
            <View
                style={[
                    styles.inputWrapper,
                    touched.password && !passwordValid && { borderColor: '#ff4d4f' },
                    passwordValid && { borderColor: '#000' },
                ]}
            >
                <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                />
                <Pressable onPress={() => setShowPassword(v => !v)} style={{ marginRight: 8 }}>
                    <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#333" />
                </Pressable>
            </View>
            {touched.password && !passwordValid && (
                <Text style={styles.error}>Mật khẩu phải có ít nhất 6 ký tự</Text>
            )}

            {/* Avatar Selection */}
            <View style={styles.avatarSection}>
                <Text style={styles.avatarLabel}>Ảnh đại diện (tùy chọn)</Text>
                <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="camera-outline" size={40} color="#ccc" />
                            <Text style={styles.avatarPlaceholderText}>Chọn ảnh</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.button, (!canSubmit || loading) && { backgroundColor: '#ccc' }]}
                activeOpacity={0.8}
                disabled={!canSubmit || loading}
                onPress={handleRegister}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Đăng ký</Text>
                )}
            </TouchableOpacity>

            <View style={styles.loginPrompt}>
                <Text style={{ color: '#000' }}>Đã có tài khoản? </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/login')}>
                    <Text style={styles.registerLink}>Đăng nhập</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default RegisterScreen;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: '#000' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d9d9d9',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#000' },
    button: { backgroundColor: '#000', padding: 15, borderRadius: 8, marginTop: 8 },
    buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
    error: { color: '#ff4d4f', marginBottom: 10 },
    loginPrompt: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
    registerLink: { color: '#000', fontWeight: 'bold', marginLeft: 4 },
    avatarSection: { marginBottom: 15 },
    avatarLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#000' },
    avatarContainer: { alignSelf: 'center' },
    avatarImage: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed'
    },
    avatarPlaceholderText: { marginTop: 5, color: '#999', fontSize: 12 },
});
