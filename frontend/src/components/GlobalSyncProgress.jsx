import { useState, useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import './GlobalSyncProgress.css';

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
        <div className="global-sync-container">
            <div className="global-sync-content">
                <div className="global-sync-text-row">
                    <span className={`global-sync-icon ${syncState.percent === 100 ? '' : 'spinning'}`}>
                        {syncState.percent === 100 ? '✅' : '🔄'}
                    </span>
                    <span className="global-sync-message">{syncState.message}</span>
                    <span className="global-sync-percent">{syncState.percent}%</span>
                </div>
                <div className="global-sync-progress-track">
                    <div
                        className="global-sync-progress-bar"
                        style={{ width: `${syncState.percent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}