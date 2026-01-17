import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
    bucket: 'avatars' | 'products';
    onUploadComplete: (url: string) => void;
    currentUrl?: string;
    className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ bucket, onUploadComplete, currentUrl, className }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB');
                return;
            }

            setIsUploading(true);

            // Create a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = fileName;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            setPreviewUrl(publicUrl);
            onUploadComplete(publicUrl);
            toast.success('Image uploaded successfully!');
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Error uploading image');
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = () => {
        setPreviewUrl(null);
        onUploadComplete('');
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {previewUrl ? (
                <div className="relative w-32 h-32 group">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-xl border"
                    />
                    <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                        <div className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-xl hover:bg-secondary/50 transition-colors">
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground mt-2">Upload</span>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
