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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => emailRegex.test(email), [email]);
  const passwordValid = useMemo(() => password.length >= 6, [password]);
  const canSubmit = emailValid && passwordValid;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const response = await axios.post('http://192.168.1.2:3000/api/auth/login', {
        email,
        password,
      });

      // Nếu login thành công, response.data.user chứa thông tin user
      const user = response.data.user;
      console.log('User info:', user);

      // Chuyển sang màn hình Home
      router.replace('/(tabs)/home'); // replace để không thể back lại login
    } catch (error: any) {
      console.log('Login error:', error.response || error.message);
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
      <Image
        source={require("../../assets/images/logo.png.png")} // 🔧 đổi đường dẫn nếu cần
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Đăng nhập</Text>

      {/* Email */}
      <View
        style={[
          styles.inputWrapper,
          touched.email && !emailValid && { borderColor: '#ff4d4f' },
          email.length > 0 && emailValid && { borderColor: '#30c48d' },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#777"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        />
        {email.length > 0 && (
          <Ionicons
            name={emailValid ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={22}
            color={emailValid ? '#30c48d' : '#ff4d4f'}
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
          password.length > 0 && passwordValid && { borderColor: '#30c48d' },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          placeholderTextColor="#777"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)} style={{ marginRight: 8 }}>
          <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#000" />
        </Pressable>
        {password.length > 0 && (
          <Ionicons
            name={passwordValid ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={22}
            color={passwordValid ? '#30c48d' : '#ff4d4f'}
          />
        )}
      </View>
      {touched.password && !passwordValid && (
        <Text style={styles.error}>Mật khẩu phải có ít nhất 6 ký tự</Text>
      )}

      {/* Liên kết quên mật khẩu */}
      <View style={{ alignItems: 'flex-end', marginBottom: 15 }}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/forgotPassword')}>
          <Text style={{ color: '#000', fontWeight: '500', fontSize: 15 }}>
            Quên mật khẩu?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nút đăng nhập */}
      <TouchableOpacity
        style={[styles.button, (!canSubmit || loading) && { backgroundColor: '#b5b5b5' }]}
        activeOpacity={0.8}
        disabled={!canSubmit || loading}
        onPress={handleLogin}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
      </TouchableOpacity>

      {/* Chuyển sang đăng ký */}
      <View style={styles.loginPrompt}>
        <Text style={styles.normalText}>Bạn chưa có tài khoản?</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/register')}>
          <Text style={styles.registerLink}> Đăng ký</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: '#000' },
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
  image: {
    width: "80%",
    height: 180,
    alignSelf: "center",
    marginBottom: 20,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#000' },
  button: { backgroundColor: '#000', padding: 15, borderRadius: 8, marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#ff4d4f', marginBottom: 10 },
  loginPrompt: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  normalText: { color: '#000', fontSize: 15 },
  registerLink: { color: '#000', fontWeight: 'bold', fontSize: 15 },
});
