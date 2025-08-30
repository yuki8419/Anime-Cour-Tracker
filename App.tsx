
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App(): React.ReactNode {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen bg-background font-sans">
          <Header />
          <main className="container mx-auto p-4">
            <Routes>
              {/* User Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/anime/:id" element={<DetailPage />} />
              
              {/* Admin Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
