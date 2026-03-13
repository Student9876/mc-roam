import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Server, Plus, Link2, User, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { parseApiResult } from '@/lib/api-result';
// Backend
import {
  GetMyServers,
  CreateServer,
  JoinServer,
  StartServer,
  StopServer,
  AuthorizeDrive,
  InstallServer,
  DeleteServer,
  GetVersions,
  LaunchPlayitExternally,
  ImportPlayitConfig,
  ForceSyncUp,
  CheckDependencies,
  InstallDependencies,
} from '../../wailsjs/go/backend/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
// Components
import SettingsModal from '../components/SettingsModal';
import WorldModal from '../components/WorldModal';
import PlayerModal from '../components/PlayerModal';
import AdminModal from '../components/AdminModal';
import Terminal from '../components/Terminal';
import ServerCard from '../components/ServerCard'; // <--- IMPORT THE NEW COMPONENT

export default function Dashboard() {
  // Dependency Check State
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [systemStatus, setSystemStatus] = useState('Checking system integrity...');
  const [systemLogs, setSystemLogs] = useState([]);

  const [servers, setServers] = useState([]);
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const refreshTimeoutRef = useRef(null);
  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  const handleRefresh = () => {
    if (refreshCooldown) return;
    loadServers();
    setRefreshCooldown(true);
    refreshTimeoutRef.current = setTimeout(() => setRefreshCooldown(false), 2000);
  };

  // Version selection state
  const [allVersions, setAllVersions] = useState([]); // Raw data from DB
  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');

  // UI State
  const [view, setView] = useState('dashboard');
  const [startingServerId, setStartingServerId] = useState(null);
  const [stoppingServerId, setStoppingServerId] = useState(null);
  const [activePort, setActivePort] = useState(null);
  const [publicAddress, setPublicAddress] = useState(null);

  // Form State
  const [newServerName, setNewServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [rcloneConf, setRcloneConf] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Wizard State
  const [createStep, setCreateStep] = useState(1);
  const [createdServerId, setCreatedServerId] = useState(null);

  // Modal State
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupServerId, setSetupServerId] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [settingsServerId, setSettingsServerId] = useState(null);
  const [worldSettingsId, setWorldSettingsId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [adminModalId, setAdminModalId] = useState(null);
  const [pendingDeleteServerId, setPendingDeleteServerId] = useState(null);

  const currentUser = sessionStorage.getItem('mc_username') || 'Unknown';
  const navigate = useNavigate();

  // Listen to system logs from backend
  useEffect(() => {
    const unsubscribe = EventsOn('server-log', (msg) => {
      setSystemLogs((prev) => [...prev, msg]);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Check dependencies on mount
  useEffect(() => {
    verifySystem();
  }, []);

  const verifySystem = async () => {
    try {
      setSystemStatus('Checking system integrity...');
      const ready = await CheckDependencies();

      if (ready) {
        setIsSystemReady(true);
        loadServers();
      } else {
        setSystemStatus('Missing critical tools. Downloading...');
        await InstallDependencies();
        setIsSystemReady(true);
        loadServers();
      }
    } catch (error) {
      setSystemStatus(`Error: ${error}. Check internet connection.`);
    }
  };

  // Use a separate effect for versions to isolate errors
  useEffect(() => {
    loadVersions();
  }, []);

  // Listen for public address events
  useEffect(() => {
    const stop = EventsOn('public-address', (addr) => setPublicAddress(addr));
    return () => stop && stop();
  }, []);

  const loadServers = async () => {
    const list = await GetMyServers(currentUser);
    // Map owner_id to owner and _id to id for compatibility everywhere
    const mappedList = (list || []).map((server) => ({
      ...server,
      owner: server.owner_id || server.owner,
      id: server.id || server._id, // <-- ensure both are set
      _id: server._id || server.id, // <-- ensure both are set
    }));
    setServers(mappedList);
  };

  const loadVersions = async () => {
    try {
      const list = await GetVersions();

      // 🛑 SAFETY CHECK: If list is null/undefined, stop here to prevent crash
      if (!list || list.length === 0) {
        console.warn('No versions found in DB.');
        return;
      }

      setAllVersions(list);

      // Extract unique types safely
      const types = [...new Set(list.map((v) => v.type))];
      setAvailableTypes(types);

      // Select defaults
      if (types.length > 0) {
        const firstType = types[0];
        setSelectedType(firstType);

        const vForType = list.filter((v) => v.type === firstType);
        if (vForType.length > 0) setSelectedVersion(vForType[0].version);
      }
    } catch (err) {
      console.error('Critical Error loading versions:', err);
    }
  };

  const handleTypeChange = (newType) => {
    setSelectedType(newType);
    const vForType = allVersions.filter((v) => v.type === newType);
    if (vForType.length > 0) setSelectedVersion(vForType[0].version);
    else setSelectedVersion('');
  };

  // --- ACTIONS ---
  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    const parsed = parseApiResult(await AuthorizeDrive('', ''));
    if (!parsed.ok) toast.error(parsed.message);
    else setRcloneConf(parsed.message);
    setIsAuthorizing(false);
  };

  const handleCreate = async () => {
    if (!newServerName || !rcloneConf || !selectedVersion) return;
    const parsed = parseApiResult(
      await CreateServer(newServerName, selectedType, selectedVersion, currentUser, rcloneConf)
    );

    if (!parsed.ok) {
      toast.error(parsed.message);
      return;
    }

    toast.success('Server created!');
    // Reset wizard
    setNewServerName('');
    setRcloneConf('');
    setCreateStep(1);
    setView('dashboard');
    loadServers();
  };

  const handleJoin = async () => {
    if (!inviteCode) return;
    const parsed = parseApiResult(await JoinServer(inviteCode, currentUser));
    if (parsed.ok) toast.success('Joined server!');
    else toast.error(parsed.message);
    setInviteCode('');
    setView('dashboard');
    loadServers();
  };

  const handleStart = async (serverId) => {
    setStartingServerId(serverId);
    setActivePort(null);
    setPublicAddress(null);
    const parsed = parseApiResult(await StartServer(serverId, currentUser));
    setStartingServerId(null);

    if (parsed.ok && parsed.message.toLowerCase().startsWith('success:')) {
      setActivePort(parsed.message.split(':')[1]);
      loadServers();
    } else if (parsed.message.toLowerCase().includes('directory not found')) {
      setSetupServerId(serverId);
      setNeedsSetup(true);
    } else {
      toast.error(parsed.message);
    }
  };

  const handleStop = async (serverId) => {
    setStoppingServerId(serverId);
    await StopServer(serverId, currentUser);
    setStoppingServerId(null);
    setActivePort(null);
    setPublicAddress(null);
    loadServers();
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    const parsed = parseApiResult(await InstallServer(setupServerId));
    if (!parsed.ok) toast.error(parsed.message);
    else {
      await StopServer(setupServerId, currentUser); // Sync up
      setNeedsSetup(false);
      toast.success('Installed! You can now start the server.');
    }
    setIsInstalling(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteServerId) return;

    const parsed = parseApiResult(await DeleteServer(pendingDeleteServerId, currentUser));
    if (parsed.ok) {
      toast.success('Server deleted.');
      setPendingDeleteServerId(null);
      loadServers(); // Refresh list immediately
    } else {
      toast.error(parsed.message);
    }
  };

  // Loading Screen - Show while checking dependencies
  if (!isSystemReady) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[linear-gradient(135deg,#0f0f0f_0%,#1a1a1a_100%)] text-[var(--color-text-secondary)]">
        <RefreshCw className="size-16 mb-8 text-primary animate-spin" />
        <h2 className="text-3xl font-bold mb-2 text-[var(--color-accent-yellow)]">
          Setting up Local Cloud
        </h2>
        <p className="text-base text-[var(--color-text-dim)] mb-8">{systemStatus}</p>

        {/* Log Output Window */}
        {systemLogs.length > 0 && (
          <div className="w-[500px] max-h-[300px] bg-[var(--color-bg-deep)] border border-[var(--color-border-subtle)] rounded-lg p-4 overflow-y-auto font-mono text-sm">
            {systemLogs.map((log, idx) => (
              <div key={idx} className="mb-1 text-[var(--color-accent-green5)]">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const navBtnBase = 'w-full justify-start gap-2.5 text-sm font-medium';
  const inputCls =
    'w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-medium)] rounded text-[var(--color-text-secondary)] p-2.5 text-base outline-none transition-colors focus:border-[var(--color-accent-blue2)]';

  return (
    <div className="flex h-screen bg-[var(--color-bg-root)] text-[var(--color-text-secondary)] overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-[250px] bg-[var(--color-bg-surface)] px-4 py-5 border-r border-[var(--color-border-subtle)] flex flex-col">
        <h2 className="mb-4 text-primary text-xl font-bold px-1">MC Roam</h2>

        {/* User Info */}
        <div className="mb-4 pb-3 border-b border-[var(--color-border-subtle)] px-1">
          <div className="text-[0.65rem] text-muted-foreground mb-0.5">Logged in as</div>
          <div className="font-bold text-sm break-words text-primary">{currentUser}</div>
        </div>

        <nav className="flex flex-col gap-1 mb-auto">
          <Button
            variant={view === 'dashboard' ? 'default' : 'ghost'}
            className={navBtnBase}
            onClick={() => setView('dashboard')}
          >
            <Server className="size-4" />
            Servers
          </Button>
          <Button
            variant={view === 'create' ? 'default' : 'ghost'}
            className={navBtnBase}
            onClick={() => setView('create')}
          >
            <Plus className="size-4" />
            Create
          </Button>
          <Button
            variant={view === 'join' ? 'default' : 'ghost'}
            className={navBtnBase}
            onClick={() => setView('join')}
          >
            <Link2 className="size-4" />
            Join
          </Button>
          <Button
            variant={view === 'account' ? 'default' : 'ghost'}
            className={navBtnBase}
            onClick={() => setView('account')}
          >
            <User className="size-4" />
            Account
          </Button>

          <Separator className="my-2" />

          <Button
            variant="destructive"
            className={`${navBtnBase} mt-1`}
            onClick={() => {
              sessionStorage.clear();
              navigate('/');
            }}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-5 overflow-y-auto flex flex-col">
        {/* DYNAMIC VIEWS */}
        {view === 'dashboard' && (
          <div>
            <div className="flex items-center mb-2.5 justify-between">
              <h1 className="text-3xl font-bold mb-0 text-[var(--color-accent-yellow)]">
                My Servers
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshCooldown}
                className="size-8 text-muted-foreground hover:text-primary"
                title={
                  refreshCooldown ? 'Please wait before refreshing again' : 'Refresh server list'
                }
              >
                <RefreshCw className={`size-4 ${refreshCooldown ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              {servers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={{
                    ...server,
                    public_address:
                      server.lock.hosted_by === currentUser &&
                      server.lock.is_running &&
                      publicAddress
                        ? publicAddress
                        : null,
                    local_port: server.lock?.port || activePort || 25565,
                  }}
                  currentUser={currentUser}
                  isStarting={startingServerId === server.id}
                  isStopping={stoppingServerId === server.id}
                  onStart={() => handleStart(server.id)}
                  onStop={() => handleStop(server.id)}
                  onSettings={() => setSettingsServerId(server.id)}
                  onWorld={() => setWorldSettingsId(server.id)}
                  onPlayers={() => setPlayerId(server.id)}
                  onAdmins={() => setAdminModalId(server.id)}
                  onDelete={() => setPendingDeleteServerId(server.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Create View - 3 STEP WIZARD */}
        {view === 'create' && (
          <div className="max-w-[500px]">
            <h1 className="text-3xl font-bold mb-5 text-[var(--color-accent-yellow)]">
              Create New Server
            </h1>

            {/* STEP INDICATORS */}
            <div className="flex gap-2.5 mb-5 text-xs items-center">
              <span
                style={{
                  color:
                    createStep >= 1 ? 'var(--color-accent-yellow)' : 'var(--color-border-medium)',
                  fontWeight: createStep === 1 ? 'bold' : 'normal',
                }}
              >
                1. Details
              </span>
              <span className="text-[var(--color-border-medium)]">→</span>
              <span
                style={{
                  color:
                    createStep >= 2 ? 'var(--color-accent-yellow)' : 'var(--color-border-medium)',
                  fontWeight: createStep === 2 ? 'bold' : 'normal',
                }}
              >
                2. Cloud
              </span>
            </div>

            {/* STEP 1: DETAILS */}
            {createStep === 1 && (
              <>
                <div className="mb-4">
                  <label className="block mb-2 text-sm text-[var(--color-text-sec)]">
                    Server Name
                  </label>
                  <Input
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="e.g. Survival World"
                  />
                </div>

                {/* VERSION SELECTION ROW */}
                <div className="flex gap-4 mb-5">
                  <div className="flex-1">
                    <label className="block mb-2 text-sm text-[var(--color-text-sec)]">
                      Server Type
                    </label>
                    <select
                      className={inputCls}
                      value={selectedType}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      disabled={availableTypes.length === 0}
                    >
                      {availableTypes.length === 0 && <option>Loading...</option>}
                      {availableTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block mb-2 text-sm text-[var(--color-text-sec)]">
                      Game Version
                    </label>
                    <select
                      className={inputCls}
                      value={selectedVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      disabled={!selectedType}
                    >
                      {allVersions
                        .filter((v) => v.type === selectedType)
                        .map((v) => (
                          <option key={v.id} value={v.version}>
                            {v.version}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <Button
                  onClick={() => setCreateStep(2)}
                  disabled={!newServerName || !selectedVersion}
                  className="w-full"
                >
                  Next: Cloud Sync →
                </Button>
              </>
            )}

            {/* STEP 2: CLOUD */}
            {createStep === 2 && (
              <>
                <div className="mb-4">
                  <label className="block mb-2 text-sm text-[var(--color-text-sec)]">
                    Google Drive Connection
                  </label>
                  <p className="text-xs text-[var(--color-text-dim)] mb-4">
                    Your world data will be synced to Google Drive for backup and multiplayer
                    sharing.
                  </p>
                  {!rcloneConf ? (
                    <Button
                      onClick={handleAuthorize}
                      disabled={isAuthorizing}
                      className="w-full bg-[#4285f4] hover:bg-[#3367d6] text-white gap-2.5"
                    >
                      <Link2 className="size-4" />
                      {isAuthorizing ? 'Waiting...' : 'Link Google Drive'}
                    </Button>
                  ) : (
                    <div className="w-full text-center font-bold bg-[var(--color-accent-green3)] text-[var(--color-bg-root)] rounded px-2.5 py-2.5 text-base">
                      ✅ Google Drive Connected
                    </div>
                  )}
                </div>

                <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg mb-5 text-sm leading-relaxed text-[var(--color-text-sec)]">
                  <div className="mb-2 text-[var(--color-accent-yellow)] font-bold">
                    🌐 Public Access (Optional)
                  </div>
                  <p className="m-0">
                    To enable public access for this server, set up your Playit account in{' '}
                    <b>Account Settings</b> (sidebar) before hosting.
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <Button variant="outline" className="flex-1" onClick={() => setCreateStep(1)}>
                    ← Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!rcloneConf}
                    onClick={async () => {
                      const parsed = parseApiResult(
                        await CreateServer(
                          newServerName,
                          selectedType,
                          selectedVersion,
                          currentUser,
                          rcloneConf
                        )
                      );
                      if (!parsed.ok) {
                        toast.error(parsed.message);
                        return;
                      }
                      toast.success('Server created successfully!');
                      setNewServerName('');
                      setRcloneConf('');
                      setCreateStep(1);
                      setCreatedServerId(null);
                      loadServers();
                      setView('dashboard');
                    }}
                  >
                    ✅ Create Server
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Join View */}
        {view === 'join' && (
          <div className="max-w-[500px]">
            <h1 className="text-3xl font-bold mb-5 text-[var(--color-accent-yellow)]">
              Join Existing Server
            </h1>
            <p className="text-[var(--color-text-dim)] mb-5">
              Paste the Invite Code shared by your friend.
            </p>
            <div className="flex gap-2.5">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter Invite Code"
              />
              <Button onClick={handleJoin}>Join</Button>
            </div>
          </div>
        )}

        {/* Account Settings View */}
        {view === 'account' && (
          <div className="max-w-[600px]">
            <h1 className="text-3xl font-bold mb-5 text-[var(--color-accent-yellow)]">
              Account Settings
            </h1>

            <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl mb-5">
              <h3 className="text-[var(--color-accent-yellow)] mb-4 text-base font-bold">
                🌐 Public Access (Playit.gg)
              </h3>
              <p className="text-[var(--color-text-sec)] text-sm mb-5">
                Set up your Playit.gg tunnel to allow friends to join your servers from anywhere.
                This setup is done once and works for all servers you host.
              </p>

              <div className="bg-[var(--color-bg-elevated)] p-4 rounded-lg mb-5 text-sm leading-relaxed text-[var(--color-text-secondary)] text-left">
                <div className="mb-2.5 font-bold text-[var(--color-accent-yellow)]">
                  Instructions:
                </div>
                <ol className="pl-5 m-0 text-left list-decimal">
                  <li className="mb-1.5">
                    Click <b>"Launch Setup Terminal"</b> below.
                  </li>
                  <li className="mb-1.5">
                    Copy the{' '}
                    <span className="text-[var(--color-accent-blue2)] font-mono">
                      https://playit.gg/claim/...
                    </span>{' '}
                    link, <b>Claim it</b> in your browser.
                  </li>
                  <li className="mb-1.5">
                    Once it says "Agent Online", you can close the terminal.
                  </li>
                  <li>
                    Click <b>"Save Playit Config"</b> below.
                  </li>
                </ol>
              </div>

              <Button
                variant="outline"
                className="w-full mb-4 gap-2 border-[var(--color-accent-yellow)] text-[var(--color-accent-yellow)] hover:bg-[var(--color-accent-yellow)]/10"
                onClick={async () => {
                  const result = await LaunchPlayitExternally('temp');
                  const parsed = parseApiResult(result);
                  if (!parsed.ok) toast.error(parsed.message);
                }}
              >
                🚀 Launch Setup Terminal
              </Button>

              <Button
                className="w-full gap-2"
                onClick={async () => {
                  const res = await ImportPlayitConfig(currentUser);
                  const parsed = parseApiResult(res);
                  if (parsed.ok) {
                    toast.success(
                      'Playit config saved! Your tunnel will work on any server you host.'
                    );
                  } else {
                    toast.error(parsed.message);
                  }
                }}
              >
                💾 Save Playit Config
              </Button>
            </div>

            <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl">
              <h3 className="text-[var(--color-accent-yellow)] mb-2.5 text-base font-bold">
                👤 User Info
              </h3>
              <div className="text-[var(--color-text-sec)] text-sm">
                <div className="mb-2">
                  <span className="text-[var(--color-text-faint)]">Username:</span>{' '}
                  <span className="text-[var(--color-text-primary)] font-bold">{currentUser}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING TERMINAL */}
      <Terminal selectedServer={servers.find((s) => s.lock?.is_running) || null} />

      {/* MODALS */}
      {settingsServerId && (
        <SettingsModal
          serverId={settingsServerId}
          currentUser={currentUser}
          onClose={() => setSettingsServerId(null)}
        />
      )}
      {worldSettingsId && (
        <WorldModal
          server={servers.find((s) => s.id === worldSettingsId)}
          currentUser={currentUser}
          onClose={() => setWorldSettingsId(null)}
        />
      )}
      {playerId && (
        <PlayerModal
          server={servers.find((s) => s.id === playerId)}
          currentUser={currentUser}
          onClose={() => setPlayerId(null)}
        />
      )}
      {adminModalId && (
        <AdminModal
          server={servers.find((s) => s.id === adminModalId)}
          currentUser={currentUser}
          onClose={() => setAdminModalId(null)}
        />
      )}

      <Dialog open={needsSetup} onOpenChange={(open) => !open && setNeedsSetup(false)}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Server Detected</DialogTitle>
          </DialogHeader>
          {(() => {
            const server = servers.find((s) => String(s.id) === String(setupServerId));
            return (
              <>
                <div className="mb-2.5 text-[var(--color-accent-green3)] font-semibold">
                  {(server?.type || 'Minecraft') + ' ' + (server?.version || '?')}
                </div>
                <div className="mb-2.5 text-[var(--color-text-secondary)] text-sm">
                  <b>Name:</b> {server?.name || 'Unknown'}
                  <br />
                  <b>Owner:</b> {server?.owner || server?.owner_id || '?'}
                  <br />
                  <b>Invite Code:</b> {server?.invite_code || '?'}
                </div>
              </>
            );
          })()}
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
            This server is not fully set up yet. Please install the necessary files to get started.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNeedsSetup(false)}>
              Cancel
            </Button>
            <Button onClick={handleInstall} disabled={isInstalling}>
              {isInstalling ? 'Downloading...' : 'Install & Fix'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingDeleteServerId}
        onOpenChange={(open) => !open && setPendingDeleteServerId(null)}
      >
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Server</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes the server, world files, and cloud backup. This action cannot
            be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteServerId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
