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
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { Settings, Trash2, Copy, RefreshCw, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RoomEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: {
    id: string;
    name: string;
    description?: string;
    inviteCode?: string;
    avatar?: string;
  };
  onUpdate: (roomId: string, name: string, description: string, avatarUrl?: string) => Promise<void>;
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
  const [avatarUrl, setAvatarUrl] = useState(room.avatar || "");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome do canal é obrigatório");
      return;
    }

    setLoading(true);
    try {
      // Pass avatarUrl to update function so it persists
      await onUpdate(room.id, name.trim(), description.trim(), avatarUrl || undefined);
      toast.success("Canal atualizado!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao atualizar canal");
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
      toast.success("Canal excluído");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao excluir canal");
    } finally {
      setLoading(false);
      setDeleteConfirm(false);
    }
  };

  const copyInviteCode = () => {
    if (room.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      toast.success("Código copiado!");
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Remover foto do grupo?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ avatar_url: null })
        .eq('id', room.id);

      if (error) throw error;

      setAvatarUrl('');
      toast.success("Foto removida!");
    } catch (error: any) {
      toast.error("Erro ao remover foto");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (url: string) => {
    setAvatarUrl(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações do Canal
          </DialogTitle>
          <DialogDescription>
            {isOwner ? "Gerencie as configurações do canal" : "Visualizar detalhes do canal"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Group Photo - Only for owners */}
          {isOwner && (
            <div className="flex flex-col items-center gap-3">
              <Label className="self-start">Foto do Grupo</Label>
              <ProfilePhotoUpload
                currentImageUrl={avatarUrl}
                onUploadComplete={handleUploadComplete}
                type="group"
                entityId={room.id}
                size="lg"
              />
              <div className="flex gap-2">
                {avatarUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={loading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="room-name">Nome do Canal</Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="room-desc">Descrição</Label>
            <Textarea
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isOwner}
              className="resize-none"
              rows={3}
              placeholder="Sobre o que é este canal?"
            />
          </div>

          {/* Invite Code */}
          {room.inviteCode && (
            <div className="space-y-2">
              <Label>Código de Convite</Label>
              <div className="flex gap-2">
                <div className="flex-1 h-10 px-4 rounded-md bg-muted border border-border flex items-center font-mono text-sm tracking-wider">
                  {room.inviteCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteCode}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {isOwner && onRegenerateCode && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onRegenerateCode(room.id)}
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
                  className="flex-1"
                >
                  Salvar Alterações
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteConfirm ? "Confirmar?" : "Excluir"}
                </Button>
              </>
            )}
            {!isOwner && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Fechar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
