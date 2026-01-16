import React, { useState } from 'react';
import { Sparkles, AtSign, Heart, Palette, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateCreator, useCreatorCategories } from '@/hooks/useCreator';

interface CreatorApplicationFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const CreatorApplicationForm: React.FC<CreatorApplicationFormProps> = ({ onSuccess, onCancel }) => {
    const { data: categories } = useCreatorCategories();
    const createCreator = useCreateCreator();

    const [formData, setFormData] = useState({
        username: '',
        display_name: '',
        tribe_name: '',
        bio: '',
        category_id: '',
        mpesa_phone: ''
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username || !formData.display_name) {
            toast.error('Please fill in all required fields');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(formData.username)) {
            toast.error('Username can only contain letters, numbers, and underscores');
            return;
        }

        try {
            await createCreator.mutateAsync({
                username: formData.username,
                display_name: formData.display_name,
                tribe_name: formData.tribe_name || null,
                bio: formData.bio || null,
                category_id: formData.category_id || null,
                mpesa_phone: formData.mpesa_phone || null
            });

            toast.success('Application submitted successfully!');
            onSuccess();
        } catch (error: any) {
            if (error.message?.includes('duplicate')) {
                toast.error('This username is already taken');
            } else {
                toast.error(error.message || 'Failed to submit application');
            }
        }
    };

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Become a Creator
                </h2>
                <p className="text-muted-foreground">Complete your profile to start your journey.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username */}
                <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                        <AtSign className="w-4 h-4" />
                        Username <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="username"
                        placeholder="yourname"
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
                        className="lowercase"
                        required
                    />
                    <p className="text-xs text-muted-foreground">
                        Unique handle for your profile URL
                    </p>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                    <Label htmlFor="display_name">
                        Display Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="display_name"
                        placeholder="Your Name / Artist Name"
                        value={formData.display_name}
                        onChange={(e) => handleChange('display_name', e.target.value)}
                        required
                    />
                </div>

                {/* Tribe Name */}
                <div className="space-y-2">
                    <Label htmlFor="tribe_name" className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        Tribe Name
                    </Label>
                    <Input
                        id="tribe_name"
                        placeholder="e.g., The Warriors"
                        value={formData.tribe_name}
                        onChange={(e) => handleChange('tribe_name', e.target.value)}
                    />
                </div>

                {/* Category */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Category
                    </Label>
                    <Select
                        value={formData.category_id}
                        onValueChange={(value) => handleChange('category_id', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select your category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                        id="bio"
                        placeholder="Tell us about what you do..."
                        value={formData.bio}
                        onChange={(e) => handleChange('bio', e.target.value)}
                        rows={3}
                    />
                </div>

                {/* M-PESA Phone */}
                <div className="space-y-2">
                    <Label htmlFor="mpesa_phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        M-PESA Phone Number
                    </Label>
                    <Input
                        id="mpesa_phone"
                        placeholder="2547..."
                        value={formData.mpesa_phone}
                        onChange={(e) => handleChange('mpesa_phone', e.target.value)}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                        disabled={createCreator.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary/90"
                        disabled={createCreator.isPending}
                    >
                        {createCreator.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Application'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreatorApplicationForm;
