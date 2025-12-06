import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Trash2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface RoomEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: {
    id: string;
    name: string;
    description?: string;
    inviteCode?: string;
  };
  onUpdate: (roomId: string, name: string, description: string) => Promise<void>;
  onDelete: (roomId: string) => Promise<void>;
  onRegenerateCode?: (roomId: string) => Promise<void>;
  isOwner: boolean;
}

export function RoomEditorDialog({
  open,
  onOpenChange,
  room,
  onUpdate,
  onDelete,
  onRegenerateCode,
  isOwner,
}: RoomEditorDialogProps) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    setLoading(true);
    try {
      await onUpdate(room.id, name.trim(), description.trim());
      toast.success("Channel updated!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update channel");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setLoading(true);
    try {
      await onDelete(room.id);
      toast.success("Channel deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete channel");
    } finally {
      setLoading(false);
      setDeleteConfirm(false);
    }
  };

  const copyInviteCode = () => {
    if (room.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      toast.success("Invite code copied!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Channel Settings
          </DialogTitle>
          <DialogDescription>
            {isOwner ? "Manage your channel settings" : "View channel details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="room-name">Channel Name</Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="room-desc">Description</Label>
            <Textarea
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isOwner}
              className="rounded-xl resize-none"
              rows={3}
              placeholder="What's this channel about?"
            />
          </div>

          {/* Invite Code */}
          {room.inviteCode && (
            <div className="space-y-2">
              <Label>Invite Code</Label>
              <div className="flex gap-2">
                <div className="flex-1 h-12 px-4 rounded-xl bg-muted/30 border border-border/50 flex items-center font-mono text-sm tracking-wider">
                  {room.inviteCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteCode}
                  className="h-12 w-12 rounded-xl"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {isOwner && onRegenerateCode && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onRegenerateCode(room.id)}
                    className="h-12 w-12 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {isOwner && (
              <>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl bg-gradient-primary hover:opacity-90"
                >
                  Save Changes
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-12 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteConfirm ? "Confirm?" : "Delete"}
                </Button>
              </>
            )}
            {!isOwner && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 rounded-xl"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
