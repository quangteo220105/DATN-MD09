# Hướng dẫn hoàn chỉnh: Hiển thị Avatar và Tên User

## Tóm tắt các thay đổi đã thực hiện:

### ✅ **Backend (Hoàn thành)**
1. **User Model**: Thêm thuộc tính `avatar` vào User schema
2. **API Routes**: Cập nhật API đăng ký, đăng nhập và thêm API lấy thông tin user
3. **Upload**: Cấu hình multer để xử lý upload avatar

### ✅ **Frontend (Hoàn thành)**
1. **Register**: Thêm chức năng chọn ảnh avatar
2. **Login**: Cập nhật để lưu thông tin user
3. **Home**: Cập nhật để hiển thị avatar và tên user

## Các bước cài đặt cần thiết:

### 1. **Cài đặt expo-image-picker**
```cmd
cd C:\DATN\DATN-MD09\my-app
npm install expo-image-picker
```

### 2. **Cài đặt AsyncStorage**
```cmd
cd C:\DATN\DATN-MD09\my-app
npm install @react-native-async-storage/async-storage
```

### 3. **Sau khi cài đặt xong, uncomment code:**

#### Trong `home.tsx`:
```typescript
// Thay đổi từ:
// import AsyncStorage from '@react-native-async-storage/async-storage';
// Thành:
import AsyncStorage from '@react-native-async-storage/async-storage';

// Và uncomment code trong fetchUser():
const userData = await AsyncStorage.getItem('user');
if (userData) {
    const user = JSON.parse(userData);
    setUser(user);
    console.log('User loaded from AsyncStorage:', user);
} else {
    console.log('No user data found in AsyncStorage');
}
```

#### Trong `login.tsx`:
```typescript
// Thay đổi từ:
// import AsyncStorage from '@react-native-async-storage/async-storage';
// Thành:
import AsyncStorage from '@react-native-async-storage/async-storage';

// Và uncomment code:
await AsyncStorage.setItem('user', JSON.stringify(user));
```

#### Trong `register.tsx`:
```typescript
// Thay đổi từ:
// import AsyncStorage from '@react-native-async-storage/async-storage';
// Thành:
import AsyncStorage from '@react-native-async-storage/async-storage';

// Và uncomment code:
await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
```

### 4. **Rebuild ứng dụng**
```cmd
cd C:\DATN\DATN-MD09\my-app
npx expo start --clear
```

## Cách hoạt động:

### **Khi đăng ký:**
1. User chọn ảnh avatar (tùy chọn)
2. Điền thông tin và đăng ký
3. Thông tin user (bao gồm avatar) được lưu vào database
4. Thông tin user được lưu vào AsyncStorage
5. Chuyển thẳng đến màn hình Home

### **Khi đăng nhập:**
1. User nhập email/password
2. Thông tin user được lấy từ database
3. Thông tin user được lưu vào AsyncStorage
4. Chuyển đến màn hình Home

### **Trong màn hình Home:**
1. Tự động lấy thông tin user từ AsyncStorage
2. Hiển thị tên user thực tế
3. Hiển thị avatar user (nếu có) hoặc icon mặc định

## Kiểm tra hoạt động:

1. **Đăng ký tài khoản mới** với avatar
2. **Đăng nhập** với tài khoản đó
3. **Kiểm tra màn hình Home** - sẽ thấy tên và avatar của bạn

## Lưu ý:

- Nếu gặp lỗi "Cannot find module", đảm bảo đã cài đặt đúng thư viện
- Nếu vẫn gặp lỗi, thử xóa `node_modules` và cài lại
- Avatar sẽ được lưu trong thư mục `backend/uploads/`
- URL avatar sẽ là: `http://localhost:3000/uploads/filename.jpg`

