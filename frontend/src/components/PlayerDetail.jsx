import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sword,
  Wand2,
  Map,
  Eye,
  Skull,
  Heart,
  UtensilsCrossed,
  Apple,
  ArrowLeft,
  Navigation,
  MapPin,
  Users,
  User,
} from 'lucide-react';

export default function PlayerDetail({ player, knownPlayers, onBack, onAction }) {
  const [tpCoords, setTpCoords] = useState({ x: 0, y: 100, z: 0 });
  const [targetPlayer, setTargetPlayer] = useState('');

  const otherPlayers = knownPlayers.filter((p) => p.name !== player.name);

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-4 bg-card/50 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground gap-1.5 shrink-0"
        >
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 rounded-lg shrink-0 ring-1 ring-border">
            <AvatarImage
              src={`https://crafatar.com/avatars/${player.uuid || player.name}?size=40&overlay`}
            />
            <AvatarFallback className="rounded-lg bg-muted">
              <User className="size-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="text-foreground text-base font-bold leading-tight truncate">
              {player.name}
            </h2>
            <div className="text-[0.62rem] font-mono text-muted-foreground/50 truncate">
              {player.uuid}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 overflow-y-auto flex-1">
        {/* LEFT COL */}
        <div className="flex flex-col gap-4">
          {/* GAMEMODE */}
          <Panel title="Gamemode">
            <div className="grid grid-cols-2 gap-2">
              <ModeBtn
                icon={<Sword className="size-4" />}
                label="Survival"
                onClick={() => onAction('gamemode_survival', player.name)}
              />
              <ModeBtn
                icon={<Wand2 className="size-4" />}
                label="Creative"
                onClick={() => onAction('gamemode_creative', player.name)}
              />
              <ModeBtn
                icon={<Map className="size-4" />}
                label="Adventure"
                onClick={() => onAction('gamemode_adventure', player.name)}
              />
              <ModeBtn
                icon={<Eye className="size-4" />}
                label="Spectator"
                onClick={() => onAction('gamemode_spectator', player.name)}
              />
            </div>
          </Panel>

          {/* VITALS */}
          <Panel title="Vitals">
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                icon={<Skull className="size-3.5" />}
                label="Kill"
                cls="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25"
                onClick={() => onAction('kill', player.name)}
              />
              <ActionButton
                icon={<Heart className="size-3.5" />}
                label="Heal"
                cls="bg-[var(--color-accent-green4)]/15 text-[var(--color-accent-green4)] border-[var(--color-accent-green4)]/30 hover:bg-[var(--color-accent-green4)]/25"
                onClick={() => onAction('heal', player.name)}
              />
              <ActionButton
                icon={<UtensilsCrossed className="size-3.5" />}
                label="Starve"
                cls="bg-[var(--color-accent-orange)]/15 text-[var(--color-accent-orange)] border-[var(--color-accent-orange)]/30 hover:bg-[var(--color-accent-orange)]/25"
                onClick={() => onAction('starve', player.name)}
              />
              <ActionButton
                icon={<Apple className="size-3.5" />}
                label="Feed"
                cls="bg-[var(--color-accent-green4)]/15 text-[var(--color-accent-green4)] border-[var(--color-accent-green4)]/30 hover:bg-[var(--color-accent-green4)]/25"
                onClick={() => onAction('feed', player.name)}
              />
            </div>
          </Panel>
        </div>

        {/* RIGHT COL */}
        <div className="flex flex-col gap-4">
          {/* TELEPORT */}
          <Panel title="Teleport">
            <div className="flex flex-col gap-2.5">
              {/* Warp to Spawn */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2.5 border-[var(--color-accent-blue3)]/40 text-[var(--color-accent-blue2)] bg-[var(--color-accent-blue3)]/10 hover:bg-[var(--color-accent-blue3)]/20 hover:text-[var(--color-accent-blue2)]"
                onClick={() => onAction('teleport_spawn', player.name)}
              >
                <Navigation className="size-4 shrink-0" />
                Warp to Spawn
              </Button>

              {/* To Coordinates */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border/60 flex flex-col gap-2">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <MapPin className="size-3" /> Coordinates
                </div>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    placeholder="X"
                    value={tpCoords.x}
                    onChange={(e) => setTpCoords({ ...tpCoords, x: e.target.value })}
                    className="text-center px-1 h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Y"
                    value={tpCoords.y}
                    onChange={(e) => setTpCoords({ ...tpCoords, y: e.target.value })}
                    className="text-center px-1 h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Z"
                    value={tpCoords.z}
                    onChange={(e) => setTpCoords({ ...tpCoords, z: e.target.value })}
                    className="text-center px-1 h-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    onAction(
                      'teleport_coords',
                      player.name,
                      `${tpCoords.x} ${tpCoords.y} ${tpCoords.z}`
                    )
                  }
                >
                  Teleport &rarr;
                </Button>
              </div>

              {/* To Player */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border/60 flex flex-col gap-2">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Users className="size-3" /> To Player
                </div>
                <div className="flex gap-1.5">
                  <Select value={targetPlayer} onValueChange={setTargetPlayer}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Select player..." />
                    </SelectTrigger>
                    <SelectContent>
                      {otherPlayers.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={!targetPlayer}
                    onClick={() => onAction('teleport_to_player', player.name, targetPlayer)}
                  >
                    Go &rarr;
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="text-foreground font-semibold mb-3 text-sm tracking-wide">{title}</div>
      {children}
    </div>
  );
}

function ModeBtn({ icon, label, onClick }) {
  return (
    <Button
      variant="secondary"
      className="h-auto py-3 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {icon}
      <span className="text-[0.65rem] font-medium">{label}</span>
    </Button>
  );
}

function ActionButton({ icon, label, cls, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold cursor-pointer text-sm border transition-colors ${cls}`}
    >
      {icon} {label}
    </button>
  );
}
