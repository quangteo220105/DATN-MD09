import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, StyleSheet, View, Text } from 'react-native';

export default function SplashScreen() {
    useEffect(() => {
        // Chuyển sang màn hình welcome sau 3 giây
        const timer = setTimeout(() => {
            router.replace('/welcome' as any);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* CÁCH 1: Sử dụng ảnh từ assets (ảnh local) */}
            <Image
                source={require('../../assets/images/logo.png.png')} // Thay đổi đường dẫn ảnh ở đây
                style={styles.logo}
                resizeMode="contain"
            />
            {/* Text "Sport Style" */}
            <Text style={styles.brandText}>Sport Style</Text>

            {/* CÁCH 2: Sử dụng ảnh từ URL (uncomment để sử dụng) */}
            {/* 
            <Image
                source={{
                    uri: 'https://your-image-url.com/logo.png' // Thay đổi URL ảnh ở đây
                }}
                style={styles.logo}
                resizeMode="contain"
            />
            */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff', // Thay đổi màu nền ở đây
    },
    logo: {
        width: 200, // Thay đổi kích thước ảnh ở đây
        height: 200,
    },
    brandText: {
        fontSize: 28, // Kích thước chữ
        fontWeight: 'bold', // Độ đậm của chữ
        color: '#000000', // Màu chữ
        letterSpacing: 2, // Khoảng cách giữa các ký tự
        fontFamily: 'System', // Font chữ
    },
});
