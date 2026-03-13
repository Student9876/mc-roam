import { useState, useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { Progress } from '@/components/ui/progress';

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
        <div className="fixed left-0 right-0 bg-gradient-to-br from-[#1a1a1a] to-[#242424] border-t-2 border-[#4dabf7] border-b border-b-[#333] z-[9998] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] animate-[slideUp_0.3s_ease-out]"
            style={{ bottom: '200px' }}
        >
            <div className="px-5 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-3 font-mono text-[0.85rem]">
                    <span className={`text-xl ${syncState.percent === 100 ? '' : 'animate-spin'}`}>
                        {syncState.percent === 100 ? '✅' : '🔄'}
                    </span>
                    <span className="text-[#4dabf7] font-bold flex-1">{syncState.message}</span>
                    <span className="text-[#69db7c] font-bold text-[0.9rem] min-w-[45px] text-right">{syncState.percent}%</span>
                </div>
                <Progress
                    value={syncState.percent}
                    className="h-1"
                    indicatorClassName="bg-gradient-to-r from-[var(--color-accent-blue2)] to-[var(--color-accent-green3)] shadow-[0_0_8px_rgba(105,219,124,0.5)] transition-[transform] duration-300"
                />
            </div>
        </div>
    );
}