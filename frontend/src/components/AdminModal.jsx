import { useState, useEffect } from 'react';
import { GetAdmins, SetAdmin, RemoveAdmin } from '../../wailsjs/go/backend/App';
import './AdminModal.css';

export default function AdminModal({ server, currentUser, onClose }) {
    const [admins, setAdmins] = useState([]);
    const [newAdminName, setNewAdminName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const isOwner = server.owner_id === currentUser || server.owner === currentUser;

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
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="admin-modal-header">
                    <div>
                        <h2 className="admin-modal-title">Admin Management</h2>
                        <div className="admin-modal-server-name">
                            {server.name}
                        </div>
                    </div>
                    <button onClick={onClose} className="admin-modal-close-btn">×</button>
                </div>

                {/* Content */}
                <div className="admin-modal-content admin-modal-scroll">
                    {/* Info Box */}
                    <div className="admin-modal-info-box">
                        <strong>About Admin Permissions</strong>
                        <p>
                            Admins can modify server settings, world settings, and manage players.
                            Only the server owner can assign or remove admins.
                        </p>
                    </div>

                    {/* Add Admin Section (Only for Owner) */}
                    {isOwner && (
                        <div className="admin-modal-section">
                            <h3 className="admin-modal-section-title">Add New Admin</h3>
                            <div className="admin-modal-add-admin-row">
                                <input
                                    type="text"
                                    placeholder="Enter username..."
                                    value={newAdminName}
                                    onChange={(e) => setNewAdminName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddAdmin()}
                                    className="admin-modal-input"
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleAddAdmin}
                                    className="admin-modal-add-btn"
                                    disabled={loading}
                                >
                                    {loading ? '...' : 'Add'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Message Display */}
                    {message && (
                        <div className="admin-modal-message">
                            {message}
                        </div>
                    )}

                    {/* Current Admins List */}
                    <div className="admin-modal-section">
                        <h3 className="admin-modal-section-title">Current Admins ({admins.length})</h3>
                        <div className="admin-modal-admin-list">
                            {admins.length === 0 ? (
                                <div className="admin-modal-empty-state">
                                    No admins assigned yet
                                </div>
                            ) : (
                                admins.map((admin, idx) => {
                                    const isOwnerTag = admin.includes('(Owner)');
                                    const username = admin.replace(' (Owner)', '');

                                    return (
                                        <div key={idx} className="admin-modal-admin-item">
                                            <div className="admin-modal-admin-info">
                                                <span className="admin-modal-admin-icon">
                                                    {isOwnerTag ? '★' : '•'}
                                                </span>
                                                <span className="admin-modal-admin-name">
                                                    {username}
                                                </span>
                                                {isOwnerTag && (
                                                    <span className="admin-modal-owner-badge">OWNER</span>
                                                )}
                                            </div>

                                            {/* Remove button (only for owner, and can't remove themselves) */}
                                            {isOwner && !isOwnerTag && (
                                                <button
                                                    onClick={() => handleRemoveAdmin(admin)}
                                                    className="admin-modal-remove-btn"
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
                        <div className="admin-modal-hint">
                            Tip: Users must join the server before they can be made admins
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}