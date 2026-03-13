import { useState, useEffect } from 'react';
import { GetServerOptions, SaveServerOptions, GetVersions } from '../../wailsjs/go/backend/App';
import { ChangeServerVersionWails } from '../../wailsjs/go/backend/App';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseApiResult } from '@/lib/api-result';

export default function SettingsModal({ serverId, currentUser, onClose }) {
  const [props, setProps] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableVersions, setAvailableVersions] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [isChangingVersion, setIsChangingVersion] = useState(false);

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
    const parsed = parseApiResult(await SaveServerOptions(serverId, currentUser, updatedProps));
    if (parsed.ok) {
      toast.success('Settings saved.');
      onClose();
    } else {
      toast.error(parsed.message || 'Failed to save settings.');
    }
  };

  const handleChange = (key, value) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleChangeVersion = async () => {
    setIsChangingVersion(true);
    try {
      if (!selectedType || !selectedVersion) {
        setIsChangingVersion(false);
        return;
      }
      const parsed = parseApiResult(
        await ChangeServerVersionWails(serverId, selectedType, selectedVersion, currentUser)
      );
      if (parsed.ok) {
        toast.success('Server version updated.');
        onClose();
      } else {
        toast.error(parsed.message || 'Failed to change version.');
      }
    } catch (err) {
      toast.error('Failed to change version.');
    }
    setIsChangingVersion(false);
  };

  const sectionCls = 'bg-muted/30 p-4 rounded-xl border border-border';
  const sectionTitle =
    'text-xs font-bold uppercase tracking-wider text-primary mb-3 pb-2 border-b border-border';
  const fieldLabel = 'block text-xs text-muted-foreground font-medium mb-1.5 mt-2';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[850px] h-[85vh] max-h-[760px] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-7 py-5 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2.5">
            <Settings2 className="size-5" /> Server Properties
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground py-20">
            Loading settings...
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-7 py-6 pb-8 grid grid-cols-3 gap-5">
              {/* Version Change */}
              <div className={sectionCls}>
                <h4 className={sectionTitle}>Change Version</h4>
                <label className={fieldLabel}>Type</label>
                <Select
                  value={selectedType}
                  onValueChange={(v) => {
                    setSelectedType(v);
                    setSelectedVersion('');
                  }}
                  disabled={isChangingVersion}
                >
                  <SelectTrigger className="w-full mb-2">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set(availableVersions.map((v) => v.type))].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className={fieldLabel}>Version</label>
                <Select
                  value={selectedVersion}
                  onValueChange={setSelectedVersion}
                  disabled={!selectedType || isChangingVersion}
                >
                  <SelectTrigger className="w-full mb-2">
                    <SelectValue placeholder="Select version..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVersions
                      .filter((v) => v.type === selectedType)
                      .map((v) => (
                        <SelectItem key={v.id} value={v.version}>
                          {v.version}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  className="mt-3 w-full"
                  onClick={handleChangeVersion}
                  disabled={isChangingVersion || !selectedVersion}
                >
                  {isChangingVersion ? 'Changing...' : 'Change Version'}
                </Button>
              </div>

              {/* General Settings */}
              <div className={sectionCls}>
                <h4 className={sectionTitle}>General</h4>
                <label className={fieldLabel}>Max Players</label>
                <Input
                  type="number"
                  className="mb-2"
                  value={props['max-players']}
                  onChange={(e) => handleChange('max-players', e.target.value)}
                />
                <label className={fieldLabel}>Gamemode</label>
                <Select
                  value={props['gamemode']}
                  onValueChange={(v) => handleChange('gamemode', v)}
                >
                  <SelectTrigger className="w-full mb-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['survival', 'creative', 'adventure', 'spectator'].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className={fieldLabel}>Difficulty</label>
                <Select
                  value={props['difficulty']}
                  onValueChange={(v) => handleChange('difficulty', v)}
                >
                  <SelectTrigger className="w-full mb-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['peaceful', 'easy', 'normal', 'hard'].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rules */}
              <div className={sectionCls}>
                <h4 className={sectionTitle}>Rules</h4>
                <ToggleRow
                  label="Cracked (No Login)"
                  checked={!props['online-mode']}
                  onChange={(v) => handleChange('online-mode', !v)}
                />
                <ToggleRow
                  label="Whitelist"
                  checked={props['white-list']}
                  onChange={(v) => handleChange('white-list', v)}
                />
                <ToggleRow
                  label="PVP"
                  checked={props['pvp']}
                  onChange={(v) => handleChange('pvp', v)}
                />
                <ToggleRow
                  label="Command Blocks"
                  checked={props['enable-command-block']}
                  onChange={(v) => handleChange('enable-command-block', v)}
                />
                <ToggleRow
                  label="Fly"
                  checked={props['allow-flight']}
                  onChange={(v) => handleChange('allow-flight', v)}
                />
                <ToggleRow
                  label="Nether"
                  checked={props['allow-nether']}
                  onChange={(v) => handleChange('allow-nether', v)}
                />
              </div>

              {/* Spawning */}
              <div className={sectionCls}>
                <h4 className={sectionTitle}>Spawning</h4>
                <ToggleRow
                  label="Monsters"
                  checked={props['spawn-monsters']}
                  onChange={(v) => handleChange('spawn-monsters', v)}
                />
                <ToggleRow
                  label="Animals"
                  checked={props['spawn-animals']}
                  onChange={(v) => handleChange('spawn-animals', v)}
                />
                <ToggleRow
                  label="Villagers"
                  checked={props['spawn-npcs']}
                  onChange={(v) => handleChange('spawn-npcs', v)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-7 py-4 border-t border-border shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex justify-between items-center mb-2 bg-background px-3.5 py-2.5 rounded-lg border border-border hover:border-muted-foreground/30 transition-colors">
      <span className="text-sm text-foreground font-medium">{label}</span>
      <Switch checked={!!checked} onCheckedChange={onChange} />
    </div>
  );
}
