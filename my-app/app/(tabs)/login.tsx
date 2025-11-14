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
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email,
        password,
      });

      // Nếu login thành công, response.data.user chứa thông tin user
      const user = response.data.user;
      console.log('User info:', user);

      // Kiểm tra tài khoản có bị khóa không
      if (user.isLocked) {
        alert('Tài khoản này đã bị khóa!');
        setLoading(false);
        return;
      }

      // Lưu thông tin user vào AsyncStorage
      let fixedUser = { ...user };
      if (!fixedUser._id) {
        fixedUser._id = fixedUser.id || fixedUser.userId || '';
      }
      await AsyncStorage.setItem('user', JSON.stringify(fixedUser));
      console.log('User saved to AsyncStorage:', fixedUser);

      // Chuyển sang màn hình Home
      router.replace('/(tabs)/home'); // replace để không thể back lại login
    } catch (error: any) {
      console.log('Login error:', error.response || error.message);
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
        alert(errorMessage);
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
              <Image
                source={require("../../assets/images/logo.png.png")}
                style={styles.image}
                resizeMode="contain"
              />
              <Text style={styles.title}>Đăng nhập</Text>
              <Text style={styles.subtitle}>Chào mừng bạn trở lại!</Text>

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
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
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
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeIcon}>
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

              {/* Liên kết quên mật khẩu */}
              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/forgotPassword')}>
                  <Text style={styles.forgotPasswordText}>
                    Quên mật khẩu?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Nút đăng nhập */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!canSubmit || loading}
                onPress={handleLogin}
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
                    <Text style={styles.buttonText}>Đăng nhập</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>

              {/* Chuyển sang đăng ký */}
              <View style={styles.loginPrompt}>
                <Text style={styles.normalText}>Bạn chưa có tài khoản?</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/register')}>
                  <Text style={styles.registerLink}> Đăng ký</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default LoginScreen;

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
  image: {
    width: "80%",
    height: 160,
    alignSelf: "center",
    marginBottom: 16,
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
    marginBottom: 32,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 15,
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
