import { useState, useEffect, useRef } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import './Terminal.css';

export default function Terminal() {
    const [logs, setLogs] = useState([]);
    const [isMinimized, setIsMinimized] = useState(false);

    // NEW: Sync State for the "Sticky Footer"
    const [syncStatus, setSyncStatus] = useState(null);
    const syncTimeoutRef = useRef(null);

    const bufferRef = useRef([]);
    const endRef = useRef(null);
    const isAutoScroll = useRef(true);

    useEffect(() => {
        // Listener
        const stop = EventsOn("server-log", (msg) => {
            // 1. IS THIS A SYNC PROGRESS LOG? (Filter it out of main history)
            if (msg.startsWith("[Sync]:")) {
                handleSyncLog(msg);
                return; // Stop here, don't add to main logs
            }

            // 2. Normal Log? Add to buffer
            bufferRef.current.push(msg);
        });

        // Flusher (Every 100ms)
        const interval = setInterval(() => {
            if (bufferRef.current.length > 0) {
                setLogs(prev => [...prev, ...bufferRef.current].slice(-500));
                bufferRef.current = [];
            }
        }, 100);

        return () => {
            stop && stop();
            clearInterval(interval);
        };
    }, []);

    // --- NEW: Handle Sync Logs Logic ---
    const handleSyncLog = (msg) => {
        let meaningfulText = null;

        // 1. Catch Custom Status Messages (Immediate Feedback)
        if (msg.includes("STATUS:")) {
            // Extracts: "⬇️ Downloading Server Data... DO NOT CLOSE!"
            meaningfulText = msg.split("STATUS:")[1].trim();
        }
        // 2. Catch Rclone Progress
        else if (msg.includes("Transferred:") && msg.includes("%")) {
            const parts = msg.split("Transferred:");
            if (parts[1]) meaningfulText = `📦 Overall: ${parts[1].trim()}`;
        }
        else if (msg.includes(" * ")) {
            const parts = msg.split("*");
            if (parts[1]) meaningfulText = `📄 File: ${parts[1].trim()}`;
        }

        if (meaningfulText) {
            setSyncStatus(meaningfulText);

            // Keep footer alive for 3s after the last update
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(() => {
                setSyncStatus(null);
            }, 3000);
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (!isMinimized && isAutoScroll.current) {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, isMinimized, syncStatus]); // Scroll when sync status updates too

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        isAutoScroll.current = isAtBottom;
    };

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
                <div className="terminal-body" onScroll={handleScroll}>
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
                            {log}
                        </div>
                    ))}

                    {/* Dummy div for auto-scroll */}
                    <div ref={endRef} />
                </div>
            )}

            {/* --- NEW: STICKY SYNC FOOTER --- */}
            {!isMinimized && syncStatus && (
                <div className="sync-footer">
                    <span className="sync-spinner">🔄</span>
                    <span style={{ color: "#4dabf7", fontWeight: "bold" }}>{syncStatus}</span>
                </div>
            )}
        </div>
    );
}

function getLogColor(text) {
    if (text.includes("Error") || text.includes("fail") || text.includes("❌")) return "#ff6b6b";
    if (text.includes("Warn") || text.includes("⚠️")) return "#fca5a5";
    if (text.includes("[MC]")) return "#f1c40f";
    if (text.includes("Success") || text.includes("✅") || text.includes("🚀")) return "#69db7c";
    if (text.includes("Public")) return "#4dabf7";
    return "#d4d4d4";
}