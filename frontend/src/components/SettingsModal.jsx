import { useState, useEffect } from 'react';
import { GetServerOptions, SaveServerOptions, GetVersions } from '../../wailsjs/go/backend/App';
import { ChangeServerVersionWails } from '../../wailsjs/go/backend/App';
import './SettingsModal.css';

export default function SettingsModal({ serverId, currentUser, onClose }) {
    const [props, setProps] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [availableVersions, setAvailableVersions] = useState([]);
    const [selectedType, setSelectedType] = useState('');
    const [selectedVersion, setSelectedVersion] = useState('');
    const [isChangingVersion, setIsChangingVersion] = useState(false);
    const [versionChangeMsg, setVersionChangeMsg] = useState('');

    useEffect(() => {
        loadSettings();
        loadVersions();
        // eslint-disable-next-line
    }, []);

    const loadSettings = async () => {
        const data = await GetServerOptions(serverId);
        setProps(data);
        setSelectedType(data?.type || '');
        setSelectedVersion(data?.version || '');
        setIsLoading(false);
    };

    const loadVersions = async () => {
        const versions = await GetVersions();
        setAvailableVersions(versions);
    };

    const handleSave = async () => {
        const updatedProps = { ...props, version: selectedVersion, type: selectedType };
        const result = await SaveServerOptions(serverId, currentUser, updatedProps);
        alert(result);
        onClose();
    };

    const handleChange = (key, value) => {
        setProps(prev => ({ ...prev, [key]: value }));
    };

    const handleTypeChange = (e) => {
        setSelectedType(e.target.value);
        setSelectedVersion('');
    };

    const handleVersionChange = (e) => {
        setSelectedVersion(e.target.value);
    };

    const handleChangeVersion = async () => {
        setIsChangingVersion(true);
        try {
            if (!selectedType || !selectedVersion) {
                setIsChangingVersion(false);
                return;
            }
            await ChangeServerVersionWails(serverId, selectedType, selectedVersion);
            onClose();
        } catch (err) {
            // Errors will be shown in logs
        }
        setIsChangingVersion(false);
    };

    if (isLoading) {
        return <div className="settings-modal-loading">Loading Settings...</div>;
    }

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2 className="settings-modal-title">⚙️ Server Properties</h2>
                    <button onClick={onClose} className="settings-modal-close-btn">✕</button>
                </div>

                <div className="settings-modal-scroll">
                    <div className="settings-modal-grid">
                        {/* Version Change Section */}
                        <div className="settings-modal-section">
                            <h4>Change Server Version</h4>
                            <label className="settings-modal-label">Type</label>
                            <div className="settings-modal-input-wrapper">
                                <select
                                    value={selectedType || ''}
                                    onChange={handleTypeChange}
                                    className="settings-modal-input"
                                    disabled={isChangingVersion}
                                >
                                    <option value="" disabled>Select type...</option>
                                    {[...new Set(availableVersions.map(v => v.type))].map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <label className="settings-modal-label">Version</label>
                            <div className="settings-modal-input-wrapper">
                                <select
                                    value={selectedVersion || ''}
                                    onChange={handleVersionChange}
                                    className="settings-modal-input"
                                    disabled={!selectedType || isChangingVersion}
                                >
                                    <option value="" disabled>Select version...</option>
                                    {availableVersions.filter(v => v.type === selectedType).map((v) => (
                                        <option key={v.id} value={v.version}>
                                            {v.version}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="settings-modal-save-btn"
                                style={{ marginTop: 12 }}
                                onClick={handleChangeVersion}
                                disabled={isChangingVersion}
                            >
                                {isChangingVersion ? 'Changing Version...' : 'Change Version'}
                            </button>
                        </div>

                        {/* General Settings */}
                        <div className="settings-modal-section">
                            <h4>General</h4>
                            <label className="settings-modal-label">Max Players</label>
                            <div className="settings-modal-input-wrapper">
                                <input
                                    type="number"
                                    value={props["max-players"]}
                                    onChange={(e) => handleChange("max-players", e.target.value)}
                                    className="settings-modal-input"
                                />
                            </div>
                            <label className="settings-modal-label">Gamemode</label>
                            <div className="settings-modal-input-wrapper">
                                <select
                                    value={props["gamemode"]}
                                    onChange={(e) => handleChange("gamemode", e.target.value)}
                                    className="settings-modal-input"
                                >
                                    <option value="survival">Survival</option>
                                    <option value="creative">Creative</option>
                                    <option value="adventure">Adventure</option>
                                    <option value="spectator">Spectator</option>
                                </select>
                            </div>
                            <label className="settings-modal-label">Difficulty</label>
                            <div className="settings-modal-input-wrapper">
                                <select
                                    value={props["difficulty"]}
                                    onChange={(e) => handleChange("difficulty", e.target.value)}
                                    className="settings-modal-input"
                                >
                                    <option value="peaceful">Peaceful</option>
                                    <option value="easy">Easy</option>
                                    <option value="normal">Normal</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="settings-modal-section">
                            <h4>Rules</h4>
                            <Toggle label="Cracked (No Login)" checked={!props["online-mode"]} onChange={(v) => handleChange("online-mode", !v)} />
                            <Toggle label="Whitelist" checked={props["white-list"]} onChange={(v) => handleChange("white-list", v)} />
                            <Toggle label="PVP" checked={props["pvp"]} onChange={(v) => handleChange("pvp", v)} />
                            <Toggle label="Command Blocks" checked={props["enable-command-block"]} onChange={(v) => handleChange("enable-command-block", v)} />
                            <Toggle label="Fly" checked={props["allow-flight"]} onChange={(v) => handleChange("allow-flight", v)} />
                            <Toggle label="Nether" checked={props["allow-nether"]} onChange={(v) => handleChange("allow-nether", v)} />
                        </div>

                        {/* Spawning */}
                        <div className="settings-modal-section">
                            <h4>Spawning</h4>
                            <Toggle label="Monsters" checked={props["spawn-monsters"]} onChange={(v) => handleChange("spawn-monsters", v)} />
                            <Toggle label="Animals" checked={props["spawn-animals"]} onChange={(v) => handleChange("spawn-animals", v)} />
                            <Toggle label="Villagers" checked={props["spawn-npcs"]} onChange={(v) => handleChange("spawn-npcs", v)} />
                        </div>
                    </div>
                </div>

                <div className="settings-modal-footer">
                    <button onClick={handleSave} className="settings-modal-save-btn">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

// Helper Component for Toggle Switches
function Toggle({ label, checked, onChange }) {
    return (
        <div className="settings-modal-toggle-container">
            <span className="settings-modal-toggle-label">{label}</span>
            <label className="settings-modal-switch">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className={`settings-modal-slider ${checked ? 'settings-modal-slider--checked' : 'settings-modal-slider--unchecked'}`}></span>
            </label>
        </div>
    );
}