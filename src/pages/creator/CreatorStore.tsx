import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingBag, Pencil, Trash2, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import { toast } from 'sonner';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CreatorStore = () => {
  const { data: creator } = useMyCreator();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    stock: '',
    image_url: '',
    fulfillment_by: 'creator'
  });

  const { data: merchandise, isLoading } = useQuery({
    queryKey: ['creator-merch', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const createMerch = useMutation({
    mutationFn: async (newMerch: any) => {
      const { data, error } = await supabase
        .from('merchandise')
        .insert([{
          ...newMerch,
          creator_id: creator?.id,
          price: parseFloat(newMerch.price),
          stock: parseInt(newMerch.stock) || 0,
          images: newMerch.image_url ? [newMerch.image_url] : [],
          is_approved: true,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-merch'] });
      setIsDialogOpen(false);
      setFormData({ name: '', price: '', description: '', stock: '', image_url: '', fulfillment_by: 'creator' });
      toast.success('Merchandise added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add merchandise');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error('Name and Price are required');
      return;
    }
    createMerch.mutate(formData);
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Store</h1>
            <p className="text-muted-foreground">Manage your store items and inventory</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>Create a new item for your supporters to buy.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Tribe T-Shirt"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (KES)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your item..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/product-image.jpg"
                  />
                  <p className="text-xs text-muted-foreground">Paste a link to your product image</p>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-secondary/20">
                  <Checkbox
                    id="fulfillment"
                    checked={formData.fulfillment_by === 'platform'}
                    onCheckedChange={(checked) => setFormData({ ...formData, fulfillment_by: checked ? 'platform' : 'creator' })}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="fulfillment"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Partner with TribeYangu for fulfillment
                    </label>
                    <p className="text-xs text-muted-foreground">
                      We'll store, pack, and deliver your orders for a small fee (5%).
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createMerch.isPending}>
                    {createMerch.isPending ? 'Saving...' : 'Create Item'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-secondary/50" />
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : merchandise?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No items yet</h3>
              <p className="mb-4">Start selling by adding your first item.</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchandise?.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-secondary flex items-center justify-center relative overflow-hidden">
                  {item.images && (item.images as string[]).length > 0 ? (
                    <img src={(item.images as string[])[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Package className="w-12 h-12 text-muted-foreground/30" />
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/30">No Image</span>
                    </div>
                  )}
                  {(item as any).fulfillment_by === 'platform' && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary/90 text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                      <ShoppingBag className="w-3 h-3" />
                      TRIBE FULFILLED
                    </div>
                  )}
                </div>
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                    <span className="font-bold text-green-600 shrink-0">
                      KES {item.price.toLocaleString()}
                    </span>
                  </div>
                  <CardDescription className="truncate">
                    {item.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground flex justify-between items-center">
                  <span>Stock: {item.stock}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreatorStore;
