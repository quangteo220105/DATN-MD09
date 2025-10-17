import React, { useState } from "react";
import AdminLayout from "./components/AdminLayout";
import Login from "./components/Login";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Hàm logout sẽ gọi từ AdminLayout
  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return isLoggedIn ? (
    <AdminLayout onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={() => setIsLoggedIn(true)} />
  );
}

export default App;
