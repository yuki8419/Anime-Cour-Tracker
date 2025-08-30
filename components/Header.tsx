
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-surface shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          アニクール
        </Link>
        <nav>
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                管理画面
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
              管理者ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
