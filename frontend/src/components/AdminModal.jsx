import { useState, useEffect } from 'react';
import { GetAdmins, SetAdmin, RemoveAdmin } from '../../wailsjs/go/backend/App';

export default function AdminModal({ server, currentUser, onClose }) {
    const [admins, setAdmins] = useState([]);
    const [newAdminName, setNewAdminName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const isOwner = server.owner_id === currentUser || server.owner === currentUser;

    // Add custom scrollbar styles
    useEffect(() => {
        const styleId = 'admin-modal-scrollbar';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .admin-modal-scroll::-webkit-scrollbar {
                    width: 8px;
                }
                .admin-modal-scroll::-webkit-scrollbar-track {
                    background: #18181b;
                    border-radius: 4px;
                }
                .admin-modal-scroll::-webkit-scrollbar-thumb {
                    background: #3f3f46;
                    border-radius: 4px;
                }
                .admin-modal-scroll::-webkit-scrollbar-thumb:hover {
                    background: #52525b;
                }
            `;
            document.head.appendChild(style);
        }
        return () => {
            const styleEl = document.getElementById(styleId);
            if (styleEl) styleEl.remove();
        };
    }, []);

    // Load admins list on mount
    useEffect(() => {
        loadAdmins();
    }, [server.id]);

    const loadAdmins = async () => {
        try {
            const adminsList = await GetAdmins(server.id);
            setAdmins(adminsList);
        } catch (err) {
            console.error('Failed to load admins:', err);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdminName.trim()) {
            setMessage('Error: Please enter a username');
            return;
        }

        setLoading(true);
        setMessage('');
        
        try {
            const result = await SetAdmin(server.id, newAdminName.trim(), currentUser);
            
            if (result === 'Success') {
                setMessage(`Success: ${newAdminName} is now an admin`);
                setNewAdminName('');
                await loadAdmins();
            } else {
                setMessage(result);
            }
        } catch (err) {
            setMessage('Error: Failed to add admin - ' + err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (adminUsername) => {
        // Extract username from "(Owner)" suffix if present
        const username = adminUsername.replace(' (Owner)', '');
        
        if (!confirm(`Remove ${username} from admin list?`)) {
            return;
        }

        setLoading(true);
        setMessage('');
        
        try {
            const result = await RemoveAdmin(server.id, username, currentUser);
            
            if (result === 'Success') {
                setMessage(`Success: ${username} removed from admins`);
                await loadAdmins();
            } else {
                setMessage(result);
            }
        } catch (err) {
            setMessage('Error: Failed to remove admin - ' + err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff' }}>Admin Management</h2>
                        <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '5px' }}>
                            {server.name}
                        </div>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn}>×</button>
                </div>

                {/* Content */}
                <div style={styles.content} className="admin-modal-scroll">
                    {/* Info Box */}
                    <div style={styles.infoBox}>
                        <strong>About Admin Permissions</strong>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#aaa' }}>
                            Admins can modify server settings, world settings, and manage players.
                            Only the server owner can assign or remove admins.
                        </p>
                    </div>

                    {/* Add Admin Section (Only for Owner) */}
                    {isOwner && (
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Add New Admin</h3>
                            <div style={styles.addAdminRow}>
                                <input
                                    type="text"
                                    placeholder="Enter username..."
                                    value={newAdminName}
                                    onChange={(e) => setNewAdminName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddAdmin()}
                                    style={styles.input}
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleAddAdmin}
                                    style={styles.addBtn}
                                    disabled={loading}
                                >
                                    {loading ? '...' : 'Add'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Message Display */}
                    {message && (
                        <div style={styles.message}>
                            {message}
                        </div>
                    )}

                    {/* Current Admins List */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Current Admins ({admins.length})</h3>
                        <div style={styles.adminList}>
                            {admins.length === 0 ? (
                                <div style={styles.emptyState}>
                                    No admins assigned yet
                                </div>
                            ) : (
                                admins.map((admin, idx) => {
                                    const isOwnerTag = admin.includes('(Owner)');
                                    const username = admin.replace(' (Owner)', '');
                                    
                                    return (
                                        <div key={idx} style={styles.adminItem}>
                                            <div style={styles.adminInfo}>
                                                <span style={styles.adminIcon}>
                                                    {isOwnerTag ? '★' : '•'}
                                                </span>
                                                <span style={styles.adminName}>
                                                    {username}
                                                </span>
                                                {isOwnerTag && (
                                                    <span style={styles.ownerBadge}>OWNER</span>
                                                )}
                                            </div>
                                            
                                            {/* Remove button (only for owner, and can't remove themselves) */}
                                            {isOwner && !isOwnerTag && (
                                                <button
                                                    onClick={() => handleRemoveAdmin(admin)}
                                                    style={styles.removeBtn}
                                                    disabled={loading}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Member Hint */}
                    {isOwner && (
                        <div style={styles.hint}>
                            Tip: Users must join the server before they can be made admins
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(8px)'
    },
    modal: {
        background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
        width: '550px',
        maxHeight: '80vh',
        borderRadius: '16px',
        border: '1px solid #3f3f46',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
    },
    header: {
        padding: '24px',
        borderBottom: '1px solid #3f3f46',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#202023'
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: '#aaa',
        fontSize: '32px',
        cursor: 'pointer',
        padding: '0',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        transition: 'all 0.2s',
    },
    content: {
        padding: '20px',
        overflowY: 'auto',
        flex: 1
    },
    infoBox: {
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        color: '#94a3b8'
    },
    section: {
        marginBottom: '25px'
    },
    sectionTitle: {
        color: '#e5e5e5',
        fontSize: '1rem',
        marginBottom: '12px',
        fontWeight: '600'
    },
    addAdminRow: {
        display: 'flex',
        gap: '10px'
    },
    input: {
        flex: 1,
        background: '#27272a',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border 0.2s'
    },
    addBtn: {
        background: '#22c55e',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        color: '#fff',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.95rem'
    },
    message: {
        background: '#27272a',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        color: '#e5e5e5',
        fontSize: '0.9rem'
    },
    adminList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    adminItem: {
        background: '#27272a',
        border: '1px solid #3f3f46',
        borderRadius: '8px',
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s'
    },
    adminInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    adminIcon: {
        fontSize: '1.3rem',
        color: '#fbbf24'
    },
    adminName: {
        color: '#fff',
        fontSize: '1rem',
        fontWeight: '500'
    },
    ownerBadge: {
        background: '#fbbf24',
        color: '#000',
        fontSize: '0.7rem',
        fontWeight: '700',
        padding: '3px 8px',
        borderRadius: '4px',
        letterSpacing: '0.5px'
    },
    removeBtn: {
        background: '#ef4444',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#71717a',
        fontSize: '0.95rem'
    },
    hint: {
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px',
        color: '#94a3b8',
        fontSize: '0.85rem',
        marginTop: '15px'
    }
};
