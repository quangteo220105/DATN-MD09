# Khôi phục Banner trong Home.tsx

Banner đã bị mất trong quá trình chỉnh sửa. Đây là cách khôi phục:

## Bước 1: Thêm hàm renderBanner

Tìm vị trí sau hàm `renderProduct` và THÊM hàm `renderBanner`:

```typescript
const renderProduct = ({ item, index }: any) => {
    // ... code renderProduct hiện tại
};

// ✅ THÊM HÀM renderBanner
const renderBanner = () => {
    const bannerWidth = width - 40; // Trừ đi padding (20px mỗi bên)
    // Banner gốc 1920x600 => tỉ lệ 3.2:1. Giữ tỉ lệ để không bị cắt.
    const bannerAspect = 1920 / 600; // 3.2
    const bannerHeight = Math.round(bannerWidth / bannerAspect);

    return (
        <View style={styles.bannerContainer}>
            <FlatList
                ref={bannerRef}
                data={banners}
                horizontal
                pagingEnabled
                snapToAlignment="center"
                snapToInterval={bannerWidth}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => item._id ? item._id : index.toString()}
                onScroll={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
                    setCurrentIndex(index);
                }}
                renderItem={({ item }) => (
                    <View style={{ width: bannerWidth }}>
                        <Image
                            source={{ uri: item.image }}
                            style={[
                                styles.bannerImage, 
                                { 
                                    width: bannerWidth, 
                                    height: bannerHeight, 
                                    borderRadius: 10, 
                                    overflow: 'hidden' 
                                }
                            ]}
                            resizeMode="cover"
                        />
                    </View>
                )}
            />
            {/* Indicator */}
            <View style={styles.indicatorWrap}>
                {banners.map((_, i) => (
                    <View 
                        key={i} 
                        style={[
                            styles.indicator, 
                            { opacity: i === currentIndex ? 1 : 0.3 }
                        ]} 
                    />
                ))}
            </View>
        </View>
    );
};
```

## Bước 2: Thêm Banner Section vào JSX

Trong phần `ListHeaderComponent`, tìm đoạn sau Search Section và THÊM Banner Section:

```typescript
ListHeaderComponent={
    <>
        {/* User Info Section */}
        <View style={styles.userInfoSection}>
            {/* ... code user info ... */}
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
            {/* ... code search ... */}
        </View>

        {/* ✅ THÊM BANNER SECTION */}
        <View style={styles.bannerSection}>
            {loadingBanner ? (
                <View style={styles.bannerLoading}>
                    <ActivityIndicator size="small" color="#000" />
                </View>
            ) : (
                renderBanner()
            )}
        </View>

        {/* Categories Section */}
        <View style={styles.categoriesSection}>
            {/* ... code categories ... */}
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
            {/* ... code products header ... */}
        </View>
    </>
}
```

## Bước 3: Kiểm tra styles có đầy đủ không

Đảm bảo trong StyleSheet.create có các styles sau:

```typescript
bannerSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    backgroundColor: "#fff",
},
bannerLoading: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginHorizontal: 0,
},
bannerContainer: {
    alignItems: "center",
    justifyContent: "center",
},
bannerImage: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
},
indicatorWrap: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    position: "absolute",
    bottom: 20,
    width: "100%",
},
indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
},
```

## Vị trí chính xác trong ListHeaderComponent:

```typescript
ListHeaderComponent={
    <>
        {/* 1. User Info Section - có sẵn */}
        <View style={styles.userInfoSection}>...</View>

        {/* 2. Search Section - có sẵn */}
        <View style={styles.searchSection}>...</View>

        {/* 3. ✅ Banner Section - THÊM VÀO ĐÂY */}
        <View style={styles.bannerSection}>
            {loadingBanner ? (
                <View style={styles.bannerLoading}>
                    <ActivityIndicator size="small" color="#000" />
                </View>
            ) : (
                renderBanner()
            )}
        </View>

        {/* 4. Categories Section - có sẵn */}
        <View style={styles.categoriesSection}>...</View>

        {/* 5. Products Section - có sẵn */}
        <View style={styles.productsSection}>...</View>
    </>
}
```

## Kiểm tra:

1. ✅ Đã có state `banners`, `loadingBanner`, `currentIndex`, `bannerRef`
2. ✅ Đã có `fetchBanners()` trong useEffect
3. ✅ Đã có auto-slide banner trong useEffect
4. ✅ Thêm hàm `renderBanner()`
5. ✅ Thêm Banner Section vào JSX
6. ✅ Có đầy đủ styles

Sau khi hoàn thành, banner sẽ xuất hiện trở lại giữa Search và Categories!
