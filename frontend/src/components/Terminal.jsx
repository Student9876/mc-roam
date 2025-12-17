import { useState, useEffect, useRef } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import './Terminal.css'; // Import the new CSS

export default function Terminal() {
    const [logs, setLogs] = useState([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        // Listen for ANY log from backend
        const stop = EventsOn("server-log", (msg) => {
            setLogs(prev => [...prev, msg].slice(-500));
        });
        return () => stop && stop();
    }, []);

    // Auto-scroll logic
    useEffect(() => {
        if (!isMinimized) {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, isMinimized]);

    return (
        <div className="terminal-wrapper" style={{ height: isMinimized ? "30px" : "220px" }}>

            {/* Header */}
            <div className="terminal-header" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="terminal-title">
                    <span>🖥️ Terminal</span>
                    {logs.length > 0 && <span style={{ opacity: 0.5, fontSize: "0.7rem" }}> — {logs.length} events</span>}
                </div>
                <div style={{ color: "#ccc", fontSize: "0.8rem" }}>
                    {isMinimized ? "▲" : "▼"}
                </div>
            </div>

            {/* Body */}
            {!isMinimized && (
                <div className="terminal-body">
                    {logs.length === 0 && (
                        <div style={{ color: "#555", fontStyle: "italic", fontFamily: "monospace", padding: "10px" }}>
                            _ System Ready. Waiting for events...
                        </div>
                    )}

                    {logs.map((log, i) => (
                        <div key={i} className="log-line" style={{ color: getLogColor(log) }}>
                            <span className="timestamp">
                                {new Date().toLocaleTimeString('en-GB', { hour12: false })}
                            </span>
                            {formatLog(log)}
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
            )}
        </div>
    );
}

// Helper to colorize logs based on content
function getLogColor(text) {
    if (text.includes("Error") || text.includes("fail") || text.includes("❌")) return "#ff6b6b"; // Red
    if (text.includes("Warn") || text.includes("⚠️")) return "#fca5a5"; // Light Red
    if (text.includes("[MC]")) return "#f1c40f"; // Gold (Minecraft)
    if (text.includes("Success") || text.includes("✅") || text.includes("🚀")) return "#69db7c"; // Green
    if (text.includes("Public")) return "#4dabf7"; // Blue (Playit)
    return "#d4d4d4"; // Default Grey
}

// Helper to clean up the text if needed
function formatLog(text) {
    // We can strip [MC] prefix here if we want a cleaner look, 
    // but usually keeping it is better for context.
    return text;
}