
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import Header from './components/Header';

function App(): React.ReactNode {
  return (
    <HashRouter>
      <div className="min-h-screen bg-background font-sans">
        <Header />
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/anime/:id" element={<DetailPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
