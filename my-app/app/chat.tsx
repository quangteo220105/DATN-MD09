import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';

export default function ChatScreen() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.container}>
                <Text style={styles.title}>Chat với AI</Text>
                <Text style={styles.subtitle}>Tính năng sẽ có sớm.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#222', marginBottom: 8 },
    subtitle: { color: '#666' }
});


