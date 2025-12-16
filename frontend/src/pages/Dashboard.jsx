import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div style={{ padding: "2rem", color: "white", textAlign: "center" }}>
            <h1>Dashboard</h1>
            <p>Welcome to your server list.</p>
            <button
                className="btn"
                onClick={() => navigate("/")}
                style={{ marginTop: "20px", padding: "10px 20px" }}
            >
                Logout
            </button>
        </div>
    );
}