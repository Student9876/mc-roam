import { useState, useEffect, useRef } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import './Terminal.css';

export default function Terminal() {
    const [logs, setLogs] = useState([]);
    const [isMinimized, setIsMinimized] = useState(false);

    // Sync State for progress tracking
    const [syncProgress, setSyncProgress] = useState(null); // { percent: 50, message: "Downloading..." }
    const syncTimeoutRef = useRef(null);

    const bufferRef = useRef([]);
    const endRef = useRef(null);
    const isAutoScroll = useRef(true);

    useEffect(() => {
        // Listener
        const stop = EventsOn("server-log", (msg) => {
            // Check if this is a sync progress update
            if (msg.startsWith("[Sync]:")) {
                handleSyncLog(msg);
            }
            
            // Add ALL logs to terminal (no filtering)
            bufferRef.current.push(msg);
        });

        // Flusher (Every 50ms for faster updates)
        const interval = setInterval(() => {
            if (bufferRef.current.length > 0) {
                setLogs(prev => [...prev, ...bufferRef.current].slice(-1000)); // Keep more logs
                bufferRef.current = [];
            }
        }, 50); // Faster flush

        return () => {
            stop && stop();
            clearInterval(interval);
        };
    }, []);

    // --- Handle Sync Logs with Progress Tracking ---
    const handleSyncLog = (msg) => {
        let progressData = null;

        // 1. Catch Status Messages
        if (msg.includes("STATUS:")) {
            const statusText = msg.split("STATUS:")[1].trim();
            progressData = { percent: null, message: statusText };
        }
        // 2. Parse individual file progress - "Transferred: X / Y, Z%"
        else if (msg.includes("Transferred:") && msg.includes("/")) {
            // Extract transfer details
            const transferMatch = msg.match(/Transferred:\s+(.+)/);
            if (transferMatch) {
                const detail = transferMatch[1].split(',')[0].trim();
                progressData = { 
                    percent: null, 
                    message: `Transfer: ${detail}` 
                };
            }
        }
        // 3. Catch individual file transfers
        else if (msg.includes(" * ")) {
            const parts = msg.split("*");
            if (parts[1]) {
                progressData = { 
                    percent: null, 
                    message: `📄 ${parts[1].trim()}` 
                };
            }
        }

        if (progressData) {
            setSyncProgress(progressData);

            // Keep footer alive for 1.5s after the last update
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(() => {
                setSyncProgress(null);
            }, 500);
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (!isMinimized && isAutoScroll.current) {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, isMinimized, syncProgress]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        isAutoScroll.current = isAtBottom;
    };

    return (
        <div className="terminal-wrapper" style={{ height: isMinimized ? "30px" : (syncProgress ? "250px" : "220px") }}>

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

                    {logs.map((log, i) => {
                        const isSync = log.startsWith("[Sync]:");
                        const isMC = log.includes("[MC]:");
                        const isImportant = log.includes("✅") || log.includes("🚀") || log.includes("❌");
                        
                        return (
                            <div 
                                key={i} 
                                className="log-line" 
                                style={{ 
                                    color: getLogColor(log),
                                    backgroundColor: isImportant ? 'rgba(64, 192, 87, 0.05)' : 'transparent',
                                    padding: isImportant ? '4px 8px' : '2px 0',
                                    borderRadius: isImportant ? '4px' : '0',
                                    marginBottom: isImportant ? '4px' : '2px'
                                }}
                            >
                                <span className="timestamp">
                                    {new Date().toLocaleTimeString('en-GB', { hour12: false })}
                                </span>
                                {formatLog(log)}
                            </div>
                        );
                    })}

                    {/* Dummy div for auto-scroll */}
                    <div ref={endRef} />
                </div>
            )}

            {/* --- SYNC PROGRESS FOOTER (Individual File Progress) --- */}
            {!isMinimized && syncProgress && (
                <div className="sync-footer">
                    <span className="sync-spinner">🔄</span>
                    <span style={{ color: "#4dabf7", fontWeight: "500", fontSize: "0.75rem", flex: 1 }}>
                        {syncProgress.message}
                    </span>
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
    if (text.includes("[Sync]:")) return "#4dabf7";
    return "#d4d4d4";
}

function formatLog(text) {
    // Remove redundant [Sync]: prefix for cleaner display
    if (text.startsWith("[Sync]:")) {
        return text.substring(7).trim();
    }
    return text;
}