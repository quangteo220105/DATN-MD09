import { router } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const handleNext = () => {
        // Chuyển thẳng sang màn hình Home (Guest mode - như Shopee)
        router.replace('/(tabs)/home' as any);
    };

    return (
        <View style={styles.container}>
            {/* Top Section - Image */}
            <View style={styles.imageSection}>
                {/* CÁCH 1: Sử dụng ảnh từ assets (ảnh local) */}
                <Image
                    source={require('../../assets/images/welcome-shoes.png')} // Thay đổi đường dẫn ảnh ở đây
                    style={styles.shoeImage}
                    resizeMode="cover"
                />

                {/* CÁCH 2: Sử dụng ảnh từ URL (uncomment để sử dụng) */}
                {/* 
                <Image
                    source={{
                        uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
                    }}
                    style={styles.shoeImage}
                    resizeMode="cover"
                />
                */}
            </View>

            {/* Bottom Section - Text and Button */}
            <View style={styles.textSection}>
                <Text style={styles.welcomeText}>
                    We provide high quality products just for you
                </Text>

                {/* Pagination Indicator */}
                <View style={styles.paginationContainer}>
                    <View style={styles.paginationDot} />
                </View>

                {/* Next Button */}
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    imageSection: {
        flex: 0.6, // 60% màn hình cho ảnh
        backgroundColor: '#000',
    },
    shoeImage: {
        width: '100%',
        height: '100%',
    },
    textSection: {
        flex: 0.4, // 40% màn hình cho text và button
        backgroundColor: '#fff',
        paddingHorizontal: 30,
        paddingTop: 40,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        lineHeight: 32,
        marginBottom: 20,
    },
    paginationContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    paginationDot: {
        width: 30,
        height: 3,
        backgroundColor: '#333',
        borderRadius: 2,
    },
    nextButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#000',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
