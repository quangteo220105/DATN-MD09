import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/apiConfig';

const ChangePasswordScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Lấy email từ AsyncStorage
    React.useEffect(() => {
        const loadEmail = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    setEmail(user.email || "");
                }
            } catch (error) {
                console.error('Error loading email:', error);
            }
        };
        loadEmail();
    }, []);

    // Gửi mã xác nhận
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

    // Đặt lại mật khẩu
    const handleResetPassword = async () => {
        if (!resetCode.trim() || !newPassword.trim()) {
            Alert.alert("Thông báo", "Vui lòng nhập đủ thông tin!");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Thông báo", "Mật khẩu phải có ít nhất 6 ký tự!");
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
                { text: "Đóng", onPress: () => router.back() },
            ]);
        } catch (error: any) {
            console.log("Reset password error:", error.response?.data || error.message);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể đổi mật khẩu!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Tiêu đề */}
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Quên mật khẩu?</Text>
                    <Text style={styles.subtitle}>
                        Nhập email để nhận mã xác nhận và đặt lại mật khẩu mới
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Email</Text>
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

                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleSendCode}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? "Đang gửi..." : "Gửi mã xác nhận"}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Mã xác nhận</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập mã xác nhận"
                            placeholderTextColor="#999"
                            value={resetCode}
                            onChangeText={setResetCode}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                style={styles.input}
                                placeholder="Nhập mật khẩu mới"
                                placeholderTextColor="#999"
                                secureTextEntry={!showNewPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 12, top: 12 }}
                                onPress={() => setShowNewPassword(!showNewPassword)}
                            >
                                <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                            {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa"
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 8
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
    headerContainer: {
        alignItems: "center",
        marginBottom: 32,
        marginTop: 20
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
        color: "#1a1a1a"
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 20
    },
    formContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4
    },
    inputContainer: {
        marginBottom: 20
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8
    },
    input: {
        borderWidth: 1,
        borderColor: "#e1e5e9",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#1a1a1a",
        backgroundColor: "#fff"
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 12
    },
    primaryButton: {
        backgroundColor: "#1a1a1a"
    },
    secondaryButton: {
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#e1e5e9"
    },
    buttonText: {
        textAlign: "center",
        fontWeight: "600",
        fontSize: 16,
        color: "#fff"
    },
    secondaryButtonText: {
        color: "#1a1a1a"
    }
});

