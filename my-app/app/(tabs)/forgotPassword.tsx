import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
            const res = await axios.post("http://192.168.1.2:3000/api/auth/forgot-password", {
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
            const res = await axios.post("http://192.168.1.2:3000/api/auth/reset-password", {
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
        <View style={styles.container}>
            {/* 🔙 Nút quay lại */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace("/(tabs)/login")}
            >
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            {/* 🖼 Ảnh minh họa */}
            <Image
                source={require("../../assets/images/forgotPassword.png")} // 🔧 đổi đường dẫn nếu cần
                style={styles.image}
                resizeMode="contain"
            />
            <Text style={styles.title}>Quên mật khẩu</Text>

            <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                placeholderTextColor="#777"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />

            <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Đang gửi..." : "Gửi mã xác nhận"}</Text>
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="Mã xác nhận"
                placeholderTextColor="#777"
                value={resetCode}
                onChangeText={setResetCode}
            />

            <TextInput
                style={styles.input}
                placeholder="Mật khẩu mới"
                placeholderTextColor="#777"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Đang cập nhật..." : "Đổi mật khẩu"}</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
    title: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 25, color: "#000" },
    input: {
        borderWidth: 1,
        borderColor: "#d9d9d9",
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        color: "#000",
    },
    button: { backgroundColor: "#000", padding: 15, borderRadius: 8, marginTop: 5 },
    buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: 16 },
    image: {
        width: "80%",
        height: 180,
        alignSelf: "center",
        marginBottom: 20,
    },
    // 🟢 Nút quay lại
    backButton: {
        position: "absolute",
        top: 50,
        left: 20,
        flexDirection: "row",
        alignItems: "center",
    },
    backText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "500",
        marginLeft: 5,
    },
});
