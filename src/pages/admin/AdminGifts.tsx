import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface GiftItem {
    id: string;
    name: string;
    price: number;
    icon_url: string | null;
    is_active: boolean;
    created_at: string;
}

const AdminGifts = () => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        icon_url: '',
        is_active: true
    });

    const { data: gifts, isLoading } = useQuery({
        queryKey: ['admin-gifts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gifts')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            return data as GiftItem[];
        }
    });

    const createGift = useMutation({
        mutationFn: async (data: typeof formData) => {
            const { error } = await supabase
                .from('gifts')
                .insert({
                    name: data.name,
                    price: parseFloat(data.price),
                    icon_url: data.icon_url,
                    is_active: data.is_active
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-gifts'] });
            toast.success('Gift created successfully');
            resetForm();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const updateGift = useMutation({
        mutationFn: async ({ id, ...data }: typeof formData & { id: string }) => {
            const { error } = await supabase
                .from('gifts')
                .update({
                    name: data.name,
                    price: parseFloat(data.price),
                    icon_url: data.icon_url,
                    is_active: data.is_active
                })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-gifts'] });
            toast.success('Gift updated successfully');
            resetForm();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const deleteGift = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('gifts')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-gifts'] });
            toast.success('Gift deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const resetForm = () => {
        setIsOpen(false);
        setEditingGift(null);
        setFormData({
            name: '',
            price: '',
            icon_url: '',
            is_active: true
        });
    };

    const handleEdit = (gift: GiftItem) => {
        setEditingGift(gift);
        setFormData({
            name: gift.name,
            price: gift.price.toString(),
            icon_url: gift.icon_url || '',
            is_active: gift.is_active
        });
        setIsOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.price || !formData.icon_url) {
            toast.error('All fields are required');
            return;
        }

        if (editingGift) {
            updateGift.mutate({ ...formData, id: editingGift.id });
        } else {
            createGift.mutate(formData);
        }
    };

    return (
        <DashboardLayout type="admin">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-foreground">Gift Management</h1>
                        <p className="text-muted-foreground mt-1">Create and manage virtual gifts for creators</p>
                    </div>
                    <Dialog open={isOpen} onOpenChange={(open) => {
                        if (!open) resetForm();
                        else setIsOpen(true);
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Gift
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingGift ? 'Edit Gift' : 'Add New Gift'}</DialogTitle>
                                <DialogDescription>
                                    Configure a virtual gift that users can buy for creators
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Gift Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Golden Rose"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (KSh)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="icon">Icon (Emoji or URL)</Label>
                                    <Input
                                        id="icon"
                                        value={formData.icon_url}
                                        onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                                        placeholder="🌹 or https://emoji..."
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                                    <Label htmlFor="active" className="cursor-pointer">Visible to Users</Label>
                                    <Switch
                                        id="active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={createGift.isPending || updateGift.isPending}>
                                    {(createGift.isPending || updateGift.isPending) && (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    )}
                                    {editingGift ? 'Save Changes' : 'Create Gift'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : gifts?.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Gift className="w-12 h-12 mb-4 opacity-20" />
                            <p>No gifts created yet</p>
                            <Button variant="link" onClick={() => setIsOpen(true)}>Add your first gift</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {gifts?.map((gift) => (
                            <Card key={gift.id} className={!gift.is_active ? 'opacity-60' : ''}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="text-3xl">{gift.icon_url}</div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(gift)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                                            if (confirm('Delete this gift?')) deleteGift.mutate(gift.id);
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardTitle className="text-xl mb-1">{gift.name}</CardTitle>
                                    <CardDescription className="text-lg font-bold text-green-600">
                                        KSh {gift.price.toLocaleString()}
                                    </CardDescription>
                                    {!gift.is_active && (
                                        <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] bg-muted font-bold uppercase">
                                            Hidden
                                        </span>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminGifts;
