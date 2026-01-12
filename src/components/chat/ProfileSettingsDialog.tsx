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
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { User, Camera, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    username: string;
    avatar?: string;
    status: 'online' | 'offline' | 'away' | 'busy';
  };
  onProfileUpdate?: () => void;
}

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  user,
  onProfileUpdate,
}: ProfileSettingsDialogProps) {
  const [username, setUsername] = useState(user.username);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error("Nome de usuário é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Perfil atualizado!");
      onProfileUpdate?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar perfil");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Remover foto de perfil?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setAvatarUrl('');
      toast.success("Foto removida!");
      onProfileUpdate?.();
    } catch (error: any) {
      toast.error("Erro ao remover foto");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (url: string) => {
    setAvatarUrl(url);
    onProfileUpdate?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Configurações do Perfil
          </DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-4">
            <ProfilePhotoUpload
              currentImageUrl={avatarUrl}
              onUploadComplete={handleUploadComplete}
              type="profile"
              entityId={user.id}
              size="lg"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Alterar Foto
              </Button>
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

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Nome de Usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu nome de usuário"
            />
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full"
          >
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
