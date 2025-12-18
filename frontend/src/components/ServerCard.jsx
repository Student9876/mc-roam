import React, { useState } from 'react';

const ServerCard = ({ server, currentUser, onStart, onStop, onDelete, onSettings, onWorld }) => {
    const { name, invite_code, status } = server;
    const owner = server.owner || server.owner_id; // Support both field names
    const isRunning = server.lock.is_running;
    const isOnline = status === 'ONLINE' || isRunning;

    // Logic: Only the Creator (Owner) can delete.
    const isOwner = (owner === currentUser);

    // State for toggling invite code visibility
    const [showInvite, setShowInvite] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(false);

    const handleCopy = (text, event, type) => {
        if (!text) return;
        // Prevent event bubbling to parent elements
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        navigator.clipboard.writeText(text);
        
        if (type === 'invite') {
            setCopiedInvite(true);
            setTimeout(() => setCopiedInvite(false), 2000);
        } else if (type === 'address') {
            setCopiedAddress(true);
            setTimeout(() => setCopiedAddress(false), 2000);
        }
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
            height: '6px',
            background: isRunning
                ? 'linear-gradient(90deg, #40c057, #82c91e)' // Green when running
                : 'linear-gradient(90deg, #fab005, #fd7e14)', // Orange when offline
            width: '100%'
        },
        content: {
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        },
        headerRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            gap: '8px'
        },
        title: {
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 4px 0',
            wordBreak: 'break-word'
        },
        ownerTag: {
            fontSize: '0.65rem',
            color: '#666',
            background: '#252525',
            padding: '2px 5px',
            borderRadius: '3px',
            marginTop: '3px',
            display: 'inline-block'
        },
        iconGroup: {
            display: 'flex',
            gap: '6px'
        },
        iconBtn: {
            background: '#2a2a2a',
            border: '1px solid #444',
            color: '#ccc',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            fontSize: '0.9rem',
            fontWeight: 'bold'
        },
        deleteBtn: {
            color: '#fa5252',
            borderColor: 'rgba(250, 82, 82, 0.3)',
            background: 'rgba(250, 82, 82, 0.1)'
        },
        infoBlock: {
            background: '#252525',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            gap: '8px'
        },
        infoLabel: {
            color: '#888',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            minWidth: '80px',
            flexShrink: 0
        },
        infoValue: {
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            flex: 1,
            justifyContent: 'flex-end'
        },
        codeBlur: {
            fontFamily: 'monospace',
            background: '#1a1a1a',
            padding: '4px 6px',
            borderRadius: '4px',
            color: showInvite ? '#fab005' : '#555',
            cursor: 'pointer',
            userSelect: 'none',
            border: '1px dashed #444',
            fontSize: '0.75rem',
            minWidth: '70px',
            textAlign: 'center'
        },
        addressBox: {
            fontFamily: 'monospace',
            background: '#1a1a1a',
            padding: '4px 6px',
            borderRadius: '4px',
            color: '#40c057',
            fontSize: '0.75rem',
            border: '1px solid rgba(64, 192, 87, 0.3)',
            wordBreak: 'break-all',
            maxWidth: '140px'
        },
        copyBtn: {
            background: '#2a2a2a',
            border: '1px solid #444',
            color: '#4dabf7',
            padding: '4px 6px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            transition: 'all 0.2s',
            fontWeight: '500',
            flexShrink: 0
        },
        actionBtn: {
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginTop: '6px',
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
                        {/* Only Owner sees World Settings (when running) */}
                        {isOwner && isRunning && (
                            <button 
                                style={styles.iconBtn} 
                                onClick={onWorld} 
                                title="World Settings (Real-Time)"
                            >
                                <span style={{ fontSize: '14px' }}>🌍</span>
                            </button>
                        )}
                        {/* Only Owner sees Settings */}
                        {isOwner && (
                            <button style={styles.iconBtn} onClick={onSettings} title="Settings">
                                <span style={{ fontSize: '14px' }}>⚙</span>
                            </button>
                        )}
                        {/* Only Owner sees Delete (and only when stopped) */}
                        {isOwner && !isRunning && (
                            <button
                                style={{ ...styles.iconBtn, ...styles.deleteBtn }}
                                onClick={onDelete}
                                title="Delete Server"
                            >
                                <span style={{ fontSize: '16px' }}>×</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* INFO BLOCK: Invite Code & IP */}
                <div style={styles.infoBlock}>
                    {/* Invite Code Row */}
                    <div style={styles.infoRow}>
                        <div style={styles.infoLabel}>
                            <span>Invite Code</span>
                        </div>
                        <div style={styles.infoValue}>
                            <span
                                style={styles.codeBlur}
                                onClick={() => setShowInvite(!showInvite)}
                                title="Click to Reveal"
                            >
                                {showInvite ? invite_code : '••••••••'}
                            </span>
                            <button 
                                style={styles.copyBtn} 
                                onClick={(e) => handleCopy(invite_code, e, 'invite')}
                                title="Copy Invite Code"
                            >
                                {copiedInvite ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Server Address Row (Only show if running) */}
                    {isRunning && (
                        <div style={styles.infoRow}>
                            <div style={styles.infoLabel}>
                                <span>Server Address</span>
                            </div>
                            <div style={styles.infoValue}>
                                <span style={styles.addressBox}>
                                    {displayAddress}
                                </span>
                                <button 
                                    style={styles.copyBtn} 
                                    onClick={(e) => handleCopy(displayAddress, e, 'address')}
                                    title="Copy Address"
                                >
                                    {copiedAddress ? '✓ Copied' : 'Copy'}
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