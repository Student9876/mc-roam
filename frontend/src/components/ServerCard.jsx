import React, { useState } from 'react';

const ServerCard = ({ server, currentUser, onStart, onStop, onDelete, onSettings }) => {
    const { name, invite_code, status } = server;
    const owner = server.owner || server.owner_id; // Support both field names
    const isRunning = server.lock.is_running;
    const isOnline = status === 'ONLINE' || isRunning;

    // Logic: Only the Creator (Owner) can delete.
    const isOwner = (owner === currentUser);

    // State for toggling invite code visibility
    const [showInvite, setShowInvite] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2s
    };

    // Helper to format the address (Use public address if available, else localhost)
    const displayAddress = server.public_address || `localhost:${server.port || '...'}`;

    const styles = {
        card: {
            backgroundColor: '#1e1e1e',
            borderRadius: '16px',
            padding: '0', // Reset padding for header image effect
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'transform 0.2s',
            position: 'relative'
        },
        headerStrip: {
            height: '8px',
            background: isRunning
                ? 'linear-gradient(90deg, #40c057, #82c91e)' // Green when running
                : 'linear-gradient(90deg, #fab005, #fd7e14)', // Orange when offline
            width: '100%'
        },
        content: {
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        },
        headerRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start'
        },
        title: {
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 5px 0'
        },
        ownerTag: {
            fontSize: '0.75rem',
            color: '#666',
            background: '#252525',
            padding: '2px 6px',
            borderRadius: '4px',
            marginTop: '5px',
            display: 'inline-block'
        },
        iconGroup: {
            display: 'flex',
            gap: '8px'
        },
        iconBtn: {
            background: '#2a2a2a',
            border: '1px solid #444',
            color: '#ccc',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
        },
        deleteBtn: {
            color: '#fa5252',
            borderColor: 'rgba(250, 82, 82, 0.3)',
            background: 'rgba(250, 82, 82, 0.1)'
        },
        infoBlock: {
            background: '#252525',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            color: '#aaa'
        },
        codeBlur: {
            fontFamily: 'monospace',
            background: '#1a1a1a',
            padding: '4px 8px',
            borderRadius: '4px',
            color: showInvite ? '#fab005' : '#555',
            cursor: 'pointer',
            userSelect: 'none',
            border: '1px dashed #444'
        },
        copySmall: {
            fontSize: '0.8rem',
            cursor: 'pointer',
            color: '#4dabf7',
            marginLeft: '8px',
            background: 'none',
            border: 'none'
        },
        actionBtn: {
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            marginTop: '10px',
            background: isRunning ? '#fa5252' : '#228be6',
            color: 'white',
            boxShadow: isRunning ? '0 4px 15px rgba(250, 82, 82, 0.4)' : '0 4px 15px rgba(34, 139, 230, 0.4)',
            transition: 'transform 0.1s'
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.headerStrip}></div>
            <div style={styles.content}>

                {/* TOP ROW: Name + Actions */}
                <div style={styles.headerRow}>
                    <div>
                        <h3 style={styles.title}>{name}</h3>
                        <div style={styles.ownerTag}>Owner: {owner === currentUser ? 'You' : owner}</div>
                    </div>
                    <div style={styles.iconGroup}>
                        {/* Only Owner sees Settings */}
                        {isOwner && (
                            <button style={styles.iconBtn} onClick={onSettings} title="Settings">⚙️</button>
                        )}
                        {/* Only Owner sees Delete (and only when stopped) */}
                        {isOwner && !isRunning && (
                            <button
                                style={{ ...styles.iconBtn, ...styles.deleteBtn }}
                                onClick={onDelete}
                                title="Delete Server"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>

                {/* INFO BLOCK: Invite Code & IP */}
                <div style={styles.infoBlock}>
                    {/* Invite Code Row */}
                    <div style={styles.infoRow}>
                        <span>🆔 Invite Code</span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span
                                style={styles.codeBlur}
                                onClick={() => setShowInvite(!showInvite)}
                                title="Click to Reveal"
                            >
                                {showInvite ? invite_code : '••••••••'}
                            </span>
                            <button style={styles.copySmall} onClick={() => handleCopy(invite_code)}>
                                {copied ? '✅' : '📋'}
                            </button>
                        </div>
                    </div>

                    {/* Server Address Row (Only show if running) */}
                    {isRunning && (
                        <div style={styles.infoRow}>
                            <span>🌍 Address</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: '#40c057', fontFamily: 'monospace' }}>
                                    {displayAddress}
                                </span>
                                <button style={styles.copySmall} onClick={() => handleCopy(displayAddress)}>
                                    📋
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* BIG ACTION BUTTON */}
                <button
                    style={styles.actionBtn}
                    onClick={isRunning ? onStop : onStart}
                    disabled={isRunning && !isOwner} // Prevent guests from stopping
                >
                    {isRunning ? (isOwner ? 'STOP SERVER' : 'SERVER ONLINE') : 'START SERVER'}
                </button>
            </div>
        </div>
    );
};

export default ServerCard;