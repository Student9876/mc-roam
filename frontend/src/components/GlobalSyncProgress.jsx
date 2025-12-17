import { useState, useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';

export default function GlobalSyncProgress() {
    const [syncState, setSyncState] = useState(null); // { message, percent, isActive }

    useEffect(() => {
        const stop = EventsOn("server-log", (msg) => {
            // Parse sync messages
            if (msg.includes("STARTING DOWNLOAD") || msg.includes("STARTING UPLOAD")) {
                const isDownload = msg.includes("DOWNLOAD");
                setSyncState({
                    message: isDownload ? "Downloading from Cloud..." : "Uploading to Cloud...",
                    percent: 0,
                    isActive: true
                });
            }
            else if (msg.startsWith("[Sync]:") && msg.includes("Checks:") && msg.includes("%")) {
                // Parse: "Checks: 14 / 14, 100%"
                const match = msg.match(/Checks:\s+(\d+)\s+\/\s+(\d+)/);
                if (match) {
                    const current = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
                    
                    setSyncState(prev => prev ? {
                        ...prev,
                        percent,
                        isActive: true
                    } : null);
                }
            }
            else if (msg.includes("Download Complete") || msg.includes("Upload Complete")) {
                setSyncState(prev => prev ? {
                    ...prev,
                    percent: 100,
                    message: msg.includes("Download") ? "Download Complete!" : "Upload Complete!",
                    isActive: true
                } : null);
                
                // Hide after 2 seconds
                setTimeout(() => {
                    setSyncState(null);
                }, 2000);
            }
        });

        return () => stop && stop();
    }, []);

    if (!syncState || !syncState.isActive) return null;

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.textRow}>
                    <span style={styles.icon}>
                        {syncState.percent === 100 ? '✅' : '🔄'}
                    </span>
                    <span style={styles.message}>{syncState.message}</span>
                    <span style={styles.percent}>{syncState.percent}%</span>
                </div>
                <div style={styles.progressTrack}>
                    <div style={{
                        ...styles.progressBar,
                        width: `${syncState.percent}%`
                    }} />
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'fixed',
        bottom: '250px', // Above terminal
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 100%)',
        borderTop: '2px solid #4dabf7',
        borderBottom: '1px solid #333',
        zIndex: 9998,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
        animation: 'slideUp 0.3s ease-out'
    },
    content: {
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    textRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '0.85rem'
    },
    icon: {
        fontSize: '1.2rem',
        animation: 'spin 2s linear infinite'
    },
    message: {
        color: '#4dabf7',
        fontWeight: 'bold',
        flex: 1
    },
    percent: {
        color: '#69db7c',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        minWidth: '45px',
        textAlign: 'right'
    },
    progressTrack: {
        width: '100%',
        height: '4px',
        background: '#2a2a2a',
        borderRadius: '2px',
        overflow: 'hidden'
    },
    progressBar: {
        height: '100%',
        background: 'linear-gradient(90deg, #4dabf7, #69db7c)',
        transition: 'width 0.3s ease',
        borderRadius: '2px',
        boxShadow: '0 0 10px rgba(69, 219, 124, 0.5)'
    }
};
