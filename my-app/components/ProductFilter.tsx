import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    categories: { name: string; id: string }[];
    brands: string[];
}

export interface FilterState {
    selectedCategory: string;
    selectedBrand: string;
    priceRange: { min: number; max: number };
    minRating: number;
}

export default function ProductFilter({ visible, onClose, onApply, categories, brands }: FilterProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
    const [selectedBrand, setSelectedBrand] = useState<string>('Tất cả');
    const [priceMin, setPriceMin] = useState<number>(0);
    const [priceMax, setPriceMax] = useState<number>(10000000);
    const [minRating, setMinRating] = useState<number>(0);

    const handleReset = () => {
        setSelectedCategory('Tất cả');
        setSelectedBrand('Tất cả');
        setPriceMin(0);
        setPriceMax(10000000);
        setMinRating(0);
    };

    const handleApply = () => {
        onApply({
            selectedCategory,
            selectedBrand,
            priceRange: { min: priceMin, max: priceMax },
            minRating,
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.handle} />
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>Bộ lọc sản phẩm</Text>
                            <Text style={styles.headerSubtitle}>Tinh chỉnh kết quả tìm kiếm của bạn</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                        {/* Danh mục */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Ionicons name="grid" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Danh mục</Text>
                            </View>
                            <View style={styles.chipContainer}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.chip,
                                            selectedCategory === cat.name && styles.chipActive,
                                        ]}
                                        onPress={() => setSelectedCategory(cat.name)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedCategory === cat.name && styles.chipTextActive,
                                            ]}
                                        >
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Thương hiệu */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Ionicons name="pricetag" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Thương hiệu</Text>
                            </View>
                            <View style={styles.chipContainer}>
                                {['Tất cả', ...brands].map((brand) => (
                                    <TouchableOpacity
                                        key={brand}
                                        style={[
                                            styles.chip,
                                            selectedBrand === brand && styles.chipActive,
                                        ]}
                                        onPress={() => setSelectedBrand(brand)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedBrand === brand && styles.chipTextActive,
                                            ]}
                                        >
                                            {brand}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Khoảng giá */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Ionicons name="cash" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Khoảng giá</Text>
                            </View>
                            <Text style={styles.sectionSubtitle}>Nhập mức giá phù hợp với ngân sách của bạn</Text>
                            <View style={styles.priceInputRow}>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceLabel}>Từ</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        value={priceMin === 0 ? '' : priceMin.toLocaleString('vi-VN')}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/\D/g, '')) || 0;
                                            setPriceMin(num);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="0"
                                    />
                                    <Text style={styles.priceCurrency}>đ</Text>
                                </View>
                                <Text style={styles.priceSeparator}>-</Text>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceLabel}>Đến</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        value={priceMax === 10000000 ? '' : priceMax.toLocaleString('vi-VN')}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/\D/g, '')) || 10000000;
                                            setPriceMax(num);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="10,000,000"
                                    />
                                    <Text style={styles.priceCurrency}>đ</Text>
                                </View>
                            </View>
                            {/* Quick price range buttons */}
                            <View style={styles.quickPriceContainer}>
                                <TouchableOpacity
                                    style={styles.quickPriceBtn}
                                    onPress={() => { setPriceMin(0); setPriceMax(100000); }}
                                >
                                    <Text style={styles.quickPriceText}>Dưới 100.000</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.quickPriceBtn}
                                    onPress={() => { setPriceMin(100000); setPriceMax(150000); }}
                                >
                                    <Text style={styles.quickPriceText}>100.000 - 150.000</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.quickPriceBtn}
                                    onPress={() => { setPriceMin(150000); setPriceMax(300000); }}
                                >
                                    <Text style={styles.quickPriceText}>150.000 - 300.000</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.quickPriceBtn}
                                    onPress={() => { setPriceMin(300000); setPriceMax(1000000); }}
                                >
                                    <Text style={styles.quickPriceText}>Trên 300.000</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Đánh giá */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Ionicons name="star" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Đánh giá</Text>
                            </View>
                            <Text style={styles.sectionSubtitle}>Chọn số sao chính xác</Text>
                            <View style={styles.ratingContainer}>
                                {[0, 1, 2, 3, 4, 5].map((rating) => (
                                    <TouchableOpacity
                                        key={rating}
                                        style={[
                                            styles.ratingChip,
                                            minRating === rating && styles.ratingChipActive,
                                        ]}
                                        onPress={() => setMinRating(rating)}
                                    >
                                        <Text
                                            style={[
                                                styles.ratingText,
                                                minRating === rating && styles.ratingTextActive,
                                            ]}
                                        >
                                            {rating === 0 ? 'Tất cả' : `${rating}★`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                            <Ionicons name="refresh" size={18} color="#475569" />
                            <Text style={styles.resetBtnText}>Thiết lập lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                            <Text style={styles.applyBtnText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
    },
    handle: {
        width: 60,
        height: 5,
        borderRadius: 999,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    section: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#eef2ff',
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 12,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    chipActive: {
        backgroundColor: '#1d4ed8',
        borderColor: '#1d4ed8',
        shadowOpacity: 0.15,
    },
    chipText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceInputWrapper: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    priceLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 6,
    },
    priceInput: {
        borderWidth: 0,
        borderRadius: 8,
        padding: 0,
        fontSize: 14,
        color: '#0f172a',
    },
    priceCurrency: {
        position: 'absolute',
        right: 20,
        bottom: 14,
        fontSize: 14,
        color: '#94a3b8',
    },
    priceSeparator: {
        marginHorizontal: 12,
        fontSize: 16,
        color: '#94a3b8',
    },
    quickPriceContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    quickPriceBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    quickPriceText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
    },
    ratingContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ratingChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minWidth: 70,
        alignItems: 'center',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    ratingChipActive: {
        backgroundColor: '#f97316',
        borderColor: '#f97316',
        shadowOpacity: 0.12,
    },
    ratingText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    ratingTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#fff',
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 8,
    },
    resetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        gap: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    resetBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
    },
    applyBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#0f172a',
        shadowColor: '#0f172a',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    applyBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
