import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import VotePage from './components/VotingPage';
import ResultsPage from './components/ResultsPage';
import './App.css';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link 
          to="/vote" 
          className={`nav-link ${location.pathname === '/vote' ? 'active' : ''}`}
        >
          🗳️ Cast Vote
        </Link>
        <Link 
          to="/results" 
          className={`nav-link ${location.pathname === '/results' ? 'active' : ''}`}
        >
          📊 Live Results
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1 className="app-title">🏆 KBC – Kon Banega CR</h1>
          <p className="app-subtitle">Class Representative Election Portal</p>
        </header>
        
        <Navigation />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<VotePage />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>&copy; 2024 KBC Election System | Distributed 3-Tier Architecture</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;