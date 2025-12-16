import { useState } from 'react';
import { Register, Login } from '../../wailsjs/go/backend/App';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("Ready");
    const navigate = useNavigate(); // Hook to change pages

    const doLogin = async () => {
        if (!username || !password) return;
        setStatus("Logging in...");

        // Call Go Backend
        const result = await Login(username, password);

        if (result.startsWith("Success")) {
            // Save user info locally if needed (optional)
            // Navigate to Dashboard
            navigate("/dashboard");
        } else {
            setStatus(result);
        }
    };

    const doRegister = async () => {
        if (!username || !password) return;
        setStatus("Registering...");
        const result = await Register(username, password);
        setStatus(result);
    };

    return (
        <div style={{ padding: "4rem", textAlign: "center", color: "white" }}>
            <h1>Local Cloud MC</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px", margin: "2rem auto" }}>
                <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} style={{ padding: "10px" }} />
                <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={{ padding: "10px" }} />

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button className="btn" onClick={doLogin} style={{ flex: 1, padding: "10px", cursor: "pointer" }}>Login</button>
                    <button className="btn" onClick={doRegister} style={{ flex: 1, padding: "10px", cursor: "pointer" }}>Register</button>
                </div>
            </div>
            <h3 style={{ color: status.startsWith("Error") ? "red" : "#61dafb" }}>{status}</h3>
        </div>
    );
}