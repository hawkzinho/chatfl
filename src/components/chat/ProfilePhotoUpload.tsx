import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfilePhotoUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  type: 'profile' | 'group';
  entityId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

export function ProfilePhotoUpload({
  currentImageUrl,
  onUploadComplete,
  type,
  entityId,
  size = 'md',
  className,
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${entityId}-${Date.now()}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update the appropriate table
      if (type === 'profile') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', entityId);

        if (updateError) throw updateError;
      } else if (type === 'group') {
        const { error: updateError } = await supabase
          .from('chat_rooms')
          .update({ avatar_url: publicUrl })
          .eq('id', entityId);

        if (updateError) throw updateError;
      }

      onUploadComplete(publicUrl);
      toast.success('Foto atualizada com sucesso!');
      setDialogOpen(false);
      setPreviewUrl(null);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className={cn("relative group cursor-pointer", className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "rounded-full overflow-hidden bg-muted flex items-center justify-center transition-all",
            sizeClasses[size]
          )}
        >
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className={cn(
              "text-muted-foreground",
              size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-8 h-8' : 'w-12 h-12'
            )} />
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {type === 'profile' ? 'Foto de Perfil' : 'Foto do Grupo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-4">
            {previewUrl && (
              <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-muted">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setPreviewUrl(null);
                }}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Salvar Foto'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}