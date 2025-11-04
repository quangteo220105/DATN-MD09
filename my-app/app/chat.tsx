import React, { useState, useEffect, useRef } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

const ADMIN_ID = 'admin_001';
const ADMIN_NAME = 'Admin';

export default function ChatScreen() {
    const [user, setUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            loadMessages();
            const interval = setInterval(() => {
                loadMessages();
            }, 2000); // Refresh mỗi 2 giây
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const u = JSON.parse(userData);
                setUser(u);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };

    const loadMessages = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${BASE_URL}/messages/conversation?senderId=${user.id || user._id}&receiverId=${ADMIN_ID}`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !user) return;

        try {
            await axios.post(`${BASE_URL}/messages/send`, {
                senderId: user.id || user._id,
                senderName: user.name,
                senderType: 'user',
                receiverId: ADMIN_ID,
                receiverName: ADMIN_NAME,
                message: newMessage.trim()
            });

            setNewMessage('');
            loadMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Lỗi', 'Gửi tin nhắn thất bại!');
        }
    };

    if (!user) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                <View style={styles.container}>
                    <Text style={styles.subtitle}>Vui lòng đăng nhập để chat</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>

            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg: any) => (
                    <View
                        key={msg._id}
                        style={[
                            styles.messageWrapper,
                            msg.senderId === (user.id || user._id) ? styles.sentWrapper : styles.receivedWrapper
                        ]}
                    >
                        <View
                            style={[
                                styles.messageBubble,
                                msg.senderId === (user.id || user._id) ? styles.sentBubble : styles.receivedBubble
                            ]}
                        >
                            <Text
                                style={[
                                    styles.messageText,
                                    msg.senderId === (user.id || user._id) ? styles.sentText : styles.receivedText
                                ]}
                            >
                                {msg.message}
                            </Text>
                            <Text style={styles.timestamp}>
                                {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Nhập tin nhắn..."
                    placeholderTextColor="#999"
                    multiline
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
    },
    subtitle: {
        color: '#666'
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222'
    },
    messagesContainer: {
        flex: 1,
        padding: 16
    },
    messageWrapper: {
        marginBottom: 12
    },
    sentWrapper: {
        alignItems: 'flex-end'
    },
    receivedWrapper: {
        alignItems: 'flex-start'
    },
    messageBubble: {
        maxWidth: '70%',
        padding: 12,
        borderRadius: 16
    },
    sentBubble: {
        backgroundColor: '#007bff',
        borderBottomRightRadius: 4
    },
    receivedBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4
    },
    messageText: {
        fontSize: 14,
        marginBottom: 4
    },
    sentText: {
        color: '#fff'
    },
    receivedText: {
        color: '#222'
    },
    timestamp: {
        fontSize: 10,
        opacity: 0.7,
        marginTop: 4
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        alignItems: 'flex-end'
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        fontSize: 14,
        maxHeight: 100
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007bff',
        alignItems: 'center',
        justifyContent: 'center'
    }
});

