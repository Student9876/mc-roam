import React, { useState } from 'react';
import './ServerCard.css';

const ServerCard = ({ server, currentUser, onStart, onStop, onDelete, onSettings, onWorld, onPlayers, onAdmins }) => {
    const { name, invite_code, status } = server;
    const owner = server.owner || server.owner_id;
    const isRunning = server.lock.is_running;
    const isOnline = status === 'ONLINE' || isRunning;

    const isOwner = (owner === currentUser);
    const isAdmin = isOwner || (server.admins && server.admins.includes(currentUser));
    const isHost = (server.lock.hosted_by === currentUser);

    const [showInvite, setShowInvite] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(false);

    const handleCopy = (text, event, type) => {
        if (!text) return;
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

    const port = server.lock?.port || 25565;
    const displayAddress = server.public_address || `localhost:${port}`;

    return (
        <div className="server-card">
            <div className={`server-card__header-strip ${isRunning ? 'server-card__header-strip--running' : 'server-card__header-strip--offline'}`}></div>
            <div className="server-card__content">

                {/* TOP ROW: Name + Actions */}
                <div className="server-card__header-row">
                    <div>
                        <h3 className="server-card__title">{name}</h3>
                        <div className="server-card__tags">
                            <div className="server-card__owner-tag">
                                Owner: {owner === currentUser ? 'You' : owner}
                            </div>
                            {server.type && server.version && (
                                <div className="server-card__version-tag">
                                    {server.type} {server.version}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="server-card__icon-group">
                        {isAdmin && (
                            <button
                                className="server-card__icon-btn"
                                onClick={onPlayers}
                                title="Player Manager"
                            >
                                <span style={{ fontSize: '14px' }}>👤</span>
                            </button>
                        )}
                        {isAdmin && isRunning && (
                            <button
                                className="server-card__icon-btn"
                                onClick={onWorld}
                                title="World Settings (Real-Time)"
                            >
                                <span style={{ fontSize: '14px' }}>🌍</span>
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                className="server-card__icon-btn"
                                onClick={onSettings}
                                title="Settings"
                            >
                                <span style={{ fontSize: '14px' }}>⚙</span>
                            </button>
                        )}
                        {isOwner && (
                            <button
                                className="server-card__icon-btn"
                                onClick={onAdmins}
                                title="Admin Management"
                            >
                                <span style={{ fontSize: '14px' }}>👑</span>
                            </button>
                        )}
                        {isOwner && !isRunning && (
                            <button
                                className="server-card__icon-btn server-card__icon-btn--delete"
                                onClick={onDelete}
                                title="Delete Server"
                            >
                                <span style={{ fontSize: '16px' }}>×</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* INFO BLOCK: Invite Code & IP */}
                <div className="server-card__info-block">
                    {/* Invite Code Row */}
                    <div className="server-card__info-row">
                        <div className="server-card__info-label">
                            <span>Invite Code</span>
                        </div>
                        <div className="server-card__info-value">
                            <span
                                className={`server-card__code-blur ${showInvite ? 'server-card__code-blur--visible' : 'server-card__code-blur--hidden'}`}
                                onClick={() => setShowInvite(!showInvite)}
                                title="Click to Reveal"
                            >
                                {showInvite ? invite_code : '••••••••'}
                            </span>
                            <button
                                className="server-card__copy-btn"
                                onClick={(e) => handleCopy(invite_code, e, 'invite')}
                                title="Copy Invite Code"
                            >
                                {copiedInvite ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Server Address Row (Only show if running) */}
                    {isRunning && (
                        <div className="server-card__info-row">
                            <div className="server-card__info-label">
                                <span>Server Address</span>
                            </div>
                            <div className="server-card__info-value">
                                <span className="server-card__address-box">
                                    {displayAddress}
                                </span>
                                <button
                                    className="server-card__copy-btn"
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
                    className={`server-card__action-btn ${isRunning ? 'server-card__action-btn--running' : 'server-card__action-btn--stopped'}`}
                    onClick={isRunning ? onStop : onStart}
                    disabled={isRunning && !isHost}
                >
                    {isRunning ? (isHost ? 'STOP SERVER' : 'SERVER ONLINE') : 'START SERVER'}
                </button>
            </div>
        </div>
    );
};

export default ServerCard;