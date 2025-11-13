import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import axios from "axios";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from '../../config/apiConfig';

const ForgotPasswordScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // 🟢 Gửi mã xác nhận
    const handleSendCode = async () => {
        if (!email.trim()) {
            Alert.alert("Thông báo", "Vui lòng nhập email!");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/forgot-password`, {
                email: email.trim(),
            });

            if (res.data?.resetCode) {
                Alert.alert("Thành công", "Đã gửi mã xác nhận!");
                // 🔥 Tự động điền mã vào ô nhập
                setResetCode(res.data.resetCode);
            } else {
                Alert.alert("Thông báo", res.data.message || "Không nhận được mã.");
            }
        } catch (error: any) {
            console.log("Forgot password error:", error.response?.data || error.message);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi mã!");
        } finally {
            setLoading(false);
        }
    };

    // 🟢 Đặt lại mật khẩu
    const handleResetPassword = async () => {
        if (!resetCode.trim() || !newPassword.trim()) {
            Alert.alert("Thông báo", "Vui lòng nhập đủ thông tin!");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/auth/reset-password`, {
                email: email.trim(),
                resetCode: resetCode.trim(),
                newPassword: newPassword.trim(),
            });

            Alert.alert("Thành công", res.data.message, [
                { text: "Đăng nhập", onPress: () => router.replace("/(tabs)/login") },
            ]);
        } catch (error: any) {
            console.log("Reset password error:", error.response?.data || error.message);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể đổi mật khẩu!");
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
            {/* 🔙 Nút quay lại - Đặt bên ngoài ScrollView để không bị che */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace("/(tabs)/login")}
            >
                <Ionicons name="arrow-back" size={20} color="#667eea" />
                <Text style={styles.backText}>Quay lại</Text>
            </TouchableOpacity>

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
                            {/* 🖼 Ảnh minh họa */}
                            <View style={styles.imageContainer}>
                                <Image
                                    source={require("../../assets/images/forgotPassword.png")}
                                    style={styles.image}
                                    resizeMode="contain"
                                />
                            </View>

                            {/* Tiêu đề */}
                            <View style={styles.headerContainer}>
                                <Text style={styles.title}>Quên mật khẩu</Text>
                                <Text style={styles.subtitle}>
                                    Nhập email để nhận mã xác nhận và đặt lại mật khẩu mới
                                </Text>
                            </View>

                            {/* Form */}
                            <View style={styles.formContainer}>
                                {/* Email Input */}
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="mail-outline" size={20} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nhập email của bạn"
                                        placeholderTextColor="#999"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                {/* Gửi mã xác nhận Button */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    disabled={loading}
                                    onPress={handleSendCode}
                                    style={styles.button}
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
                                            colors={['#667eea', '#764ba2']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.buttonGradient}
                                        >
                                            <Text style={styles.buttonText}>Gửi mã xác nhận</Text>
                                        </LinearGradient>
                                    )}
                                </TouchableOpacity>

                                {/* Mã xác nhận Input */}
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="key-outline" size={20} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nhập mã xác nhận"
                                        placeholderTextColor="#999"
                                        value={resetCode}
                                        onChangeText={setResetCode}
                                        autoCapitalize="none"
                                    />
                                </View>

                                {/* Mật khẩu mới Input */}
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#667eea" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nhập mật khẩu mới"
                                        placeholderTextColor="#999"
                                        secureTextEntry
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                </View>

                                {/* Đổi mật khẩu Button */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    disabled={loading}
                                    onPress={handleResetPassword}
                                    style={styles.button}
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
                                            colors={['#667eea', '#764ba2']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.buttonGradient}
                                        >
                                            <Text style={styles.buttonText}>Đổi mật khẩu</Text>
                                        </LinearGradient>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

export default ForgotPasswordScreen;

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
        paddingTop: 80, // Thêm padding top để tránh card che nút quay lại
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
    headerContainer: {
        alignItems: "center",
        marginBottom: 32
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
        color: "#1a1a1a",
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 20
    },
    imageContainer: {
        alignItems: "center",
        marginBottom: 24
    },
    image: {
        width: 180,
        height: 180,
    },
    formContainer: {
        marginTop: 8,
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
        marginBottom: 16,
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
    button: {
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 16,
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
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    // 🟢 Nút quay lại
    backButton: {
        position: "absolute",
        top: 50,
        left: 20,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10, // Tăng elevation để hiển thị trên cùng
        zIndex: 1000 // Tăng zIndex để đảm bảo luôn hiển thị trên cùng
    },
    backText: {
        color: "#667eea",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 6,
    },
});
