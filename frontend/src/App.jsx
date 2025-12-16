import { HashRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
    return (
        // We use HashRouter because Wails apps serve from a local file system
        // BrowserRouter often fails in desktop apps without server configuration
        <HashRouter>
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </HashRouter>
    );
}

export default App;