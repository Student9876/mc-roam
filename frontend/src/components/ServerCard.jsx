import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Users, Globe, Settings, Crown, Trash2, Loader2 } from 'lucide-react';

const ServerCard = ({ server, currentUser, isStarting, isStopping, onStart, onStop, onDelete, onSettings, onWorld, onPlayers, onAdmins }) => {
    const { name, invite_code } = server;
    const owner = server.owner || server.owner_id;
    const isRunning = server.lock.is_running;

    const isOwner = (owner === currentUser);
    const isAdmin = isOwner || (server.admins && server.admins.includes(currentUser));
    const isHost = (server.lock.hosted_by === currentUser);

    const [showInvite, setShowInvite] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);
    const [copiedLocal, setCopiedLocal] = useState(false);
    const [copiedPublic, setCopiedPublic] = useState(false);

    const handleCopy = (text, event, setCopied) => {
        if (!text) return;
        if (event) { event.stopPropagation(); event.preventDefault(); }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const localAddress = `localhost:${server.local_port || 25565}`;
    const publicAddress = server.public_address;
    const isBusy = isStarting || isStopping;

    return (
        <TooltipProvider>
            <Card className="w-[300px] flex-shrink-0 flex flex-col overflow-hidden p-0 gap-0 border-border/60 shadow-md hover:shadow-lg transition-shadow">
                {/* Header color strip */}
                <div className={`h-1.5 w-full transition-all ${
                    isStarting
                        ? 'bg-gradient-to-r from-[var(--color-accent-blue3)] to-[var(--color-accent-yellow)] animate-pulse'
                        : isStopping
                            ? 'bg-gradient-to-r from-destructive to-[var(--color-accent-orange)] animate-pulse'
                            : isRunning
                                ? 'bg-gradient-to-r from-[var(--color-accent-green)] to-[var(--color-accent-green3)]'
                                : 'bg-gradient-to-r from-primary to-[var(--color-accent-orange)]'
                }`} />

                <CardContent className="p-4 flex flex-col gap-3">
                    {/* TOP ROW */}
                    <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-foreground mb-1 break-words text-left leading-tight">{name}</h3>
                            <div className="flex gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[0.6rem] py-0">
                                    {owner === currentUser ? 'You' : owner}
                                </Badge>
                                {server.type && server.version && (
                                    <Badge variant="secondary" className="text-[0.6rem] py-0 text-[var(--color-accent-green3)]">
                                        {server.type} {server.version}
                                    </Badge>
                                )}
                                {isRunning && (
                                    <Badge variant="success" className="text-[0.6rem] py-0">ONLINE</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            {isAdmin && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPlayers}>
                                            <Users className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Player Manager</TooltipContent>
                                </Tooltip>
                            )}
                            {isAdmin && isRunning && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onWorld}>
                                            <Globe className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>World Settings</TooltipContent>
                                </Tooltip>
                            )}
                            {isAdmin && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSettings}>
                                            <Settings className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Server Settings</TooltipContent>
                                </Tooltip>
                            )}
                            {isOwner && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAdmins}>
                                            <Crown className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Admin Management</TooltipContent>
                                </Tooltip>
                            )}
                            {isOwner && !isRunning && !isBusy && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={onDelete}>
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Server</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    {/* INFO BLOCK */}
                    <div className="bg-muted/40 p-2 rounded-lg border border-border/60 flex flex-col gap-2">
                        {/* Invite Code */}
                        <div className="flex justify-between items-center gap-2">
                            <div className="text-muted-foreground font-medium text-[0.6rem] uppercase tracking-wide w-[52px] shrink-0">
                                Invite
                            </div>
                            <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                                <span
                                    className={`font-mono bg-background px-1.5 py-1 rounded cursor-pointer select-none border border-dashed border-border text-xs w-[80px] text-center transition-colors ${showInvite ? 'text-primary' : 'text-muted-foreground/40'}`}
                                    onClick={() => setShowInvite(!showInvite)}
                                    title="Click to Reveal"
                                >
                                    {showInvite ? invite_code : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                                </span>
                                <Button variant="outline" size="sm" className="h-6 w-10 px-0 text-[0.6rem] shrink-0" onClick={(e) => handleCopy(invite_code, e, setCopiedInvite)}>
                                    {copiedInvite ? '\u2713' : 'Copy'}
                                </Button>
                            </div>
                        </div>

                        {/* Local Address (only if running) */}
                        {isRunning && (
                            <div className="flex justify-between items-center gap-2">
                                <div className="text-muted-foreground font-medium text-[0.6rem] uppercase tracking-wide w-[52px] shrink-0">
                                    Local
                                </div>
                                <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                                    <span className="font-mono bg-background px-1.5 py-1 rounded text-[var(--color-accent-green2)] text-xs border border-[var(--color-accent-green4)]/30 truncate max-w-[130px]">
                                        {localAddress}
                                    </span>
                                    <Button variant="outline" size="sm" className="h-6 w-10 px-0 text-[0.6rem] shrink-0" onClick={(e) => handleCopy(localAddress, e, setCopiedLocal)}>
                                        {copiedLocal ? '\u2713' : 'Copy'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Public Address from Playit (only if available) */}
                        {isRunning && publicAddress && (
                            <div className="flex justify-between items-center gap-2">
                                <div className="text-[var(--color-accent-blue2)] font-medium text-[0.6rem] uppercase tracking-wide w-[52px] shrink-0">
                                    Public
                                </div>
                                <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                                    <span className="font-mono bg-[var(--color-accent-blue3)]/10 px-1.5 py-1 rounded text-[var(--color-accent-blue2)] text-xs border border-[var(--color-accent-blue3)]/30 truncate max-w-[130px]">
                                        {publicAddress}
                                    </span>
                                    <Button variant="outline" size="sm" className="h-6 w-10 px-0 text-[0.6rem] shrink-0 border-[var(--color-accent-blue3)]/40 text-[var(--color-accent-blue2)]" onClick={(e) => handleCopy(publicAddress, e, setCopiedPublic)}>
                                        {copiedPublic ? '\u2713' : 'Copy'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACTION BUTTON */}
                    <Button
                        variant={isRunning ? "destructive" : "default"}
                        className={`w-full font-bold gap-2 ${!isRunning && !isBusy ? 'bg-[var(--color-accent-blue3)] hover:bg-[var(--color-accent-blue4)] text-white' : ''} ${isStarting ? 'bg-[var(--color-accent-blue3)]/70 text-white' : ''}`}
                        onClick={isRunning ? onStop : onStart}
                        disabled={(isRunning && !isHost) || isBusy}
                    >
                        {isStarting ? (
                            <><Loader2 className="size-4 animate-spin" /> Starting...</>
                        ) : isStopping ? (
                            <><Loader2 className="size-4 animate-spin" /> Stopping...</>
                        ) : isRunning ? (
                            isHost ? 'STOP SERVER' : 'SERVER ONLINE'
                        ) : 'START SERVER'}
                    </Button>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
};

export default ServerCard;
