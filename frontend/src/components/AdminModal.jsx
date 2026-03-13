import { useState, useEffect } from 'react';
import { GetAdmins, SetAdmin, RemoveAdmin } from '../../wailsjs/go/backend/App';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Shield, ShieldOff, ShieldCheck, UserPlus, Info, User } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminModal({ server, currentUser, onClose }) {
    const [admins, setAdmins] = useState([]);
    const [newAdminName, setNewAdminName] = useState('');
    const [loading, setLoading] = useState(false);

    const isOwner = server.owner_id === currentUser || server.owner === currentUser;

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
            toast.warning('Please enter a username.');
            return;
        }
        setLoading(true);
        try {
            const result = await SetAdmin(server.id, newAdminName.trim(), currentUser);
            if (result === 'Success') {
                toast.success(`${newAdminName} is now an admin.`);
                setNewAdminName('');
                await loadAdmins();
            } else {
                toast.error(result);
            }
        } catch (err) {
            toast.error('Failed to add admin: ' + err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (adminEntry) => {
        const username = adminEntry.replace(' (Owner)', '');
        setLoading(true);
        try {
            const result = await RemoveAdmin(server.id, username, currentUser);
            if (result === 'Success') {
                toast.success(`${username} removed from admins.`);
                await loadAdmins();
            } else {
                toast.error(result);
            }
        } catch (err) {
            toast.error('Failed to remove admin: ' + err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[520px] max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="size-4 text-primary" /> Admin Management
                    </DialogTitle>
                    <DialogDescription>{server.name}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="px-6 py-5 flex flex-col gap-5">

                        {/* Info Box */}
                        <div className="flex gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
                            <Info className="size-4 shrink-0 mt-0.5 text-primary" />
                            <div>
                                <strong className="text-foreground font-semibold">Admin Permissions</strong>
                                <p className="mt-1 text-xs leading-relaxed">Admins can modify server settings, world settings, and manage players. Only the server owner can assign or remove admins.</p>
                            </div>
                        </div>

                        {/* Add Admin (Owner only) */}
                        {isOwner && (
                            <div>
                                <h3 className="text-foreground text-sm font-semibold mb-3">Add New Admin</h3>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter username..."
                                        value={newAdminName}
                                        onChange={(e) => setNewAdminName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                                        disabled={loading}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleAddAdmin} disabled={loading || !newAdminName.trim()} className="gap-2 shrink-0">
                                        <UserPlus className="size-4" />
                                        {loading ? '...' : 'Add'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Admin List */}
                        <div>
                            <h3 className="text-foreground text-sm font-semibold mb-3">Current Admins ({admins.length})</h3>
                            <div className="flex flex-col gap-2">
                                {admins.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground text-sm italic">
                                        No admins assigned yet
                                    </div>
                                ) : (
                                    admins.map((admin, idx) => {
                                        const isOwnerTag = admin.includes('(Owner)');
                                        const username = admin.replace(' (Owner)', '');
                                        return (
                                            <div key={idx} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-border/80 transition-colors">
                                                <Avatar className="w-8 h-8 rounded-lg shrink-0">
                                                    <AvatarImage src={`https://crafatar.com/avatars/${username}?size=32&overlay`} />
                                                    <AvatarFallback className="rounded-lg bg-muted"><User className="size-4 text-muted-foreground" /></AvatarFallback>
                                                </Avatar>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="text-foreground font-semibold text-sm truncate">{username}</span>
                                                    {isOwnerTag
                                                        ? <Badge variant="secondary" className="shrink-0 gap-1 text-primary border-primary/30"><ShieldCheck className="size-3" />Owner</Badge>
                                                        : <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground"><Shield className="size-3" />Admin</Badge>
                                                    }
                                                </div>
                                                {isOwner && !isOwnerTag && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={loading}
                                                        onClick={() => handleRemoveAdmin(admin)}
                                                        className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                    >
                                                        <ShieldOff className="size-3.5" />
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {isOwner && (
                            <p className="text-center text-muted-foreground text-xs">
                                Tip: Users must join the server before they can be made admins
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
