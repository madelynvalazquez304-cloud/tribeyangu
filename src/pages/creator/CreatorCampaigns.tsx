import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, Pencil, Trash2, Calendar, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
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
import { format } from 'date-fns';
import { Progress } from "@/components/ui/progress";

interface Campaign {
    id: string;
    creator_id: string;
    title: string;
    description: string | null;
    goal_amount: number;
    current_amount: number;
    image_url: string | null;
    end_date: string | null;
    status: string;
    created_at: string;
}

const CreatorCampaigns = () => {
    const { data: creator } = useMyCreator();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        goal_amount: '',
        end_date: '',
        image_url: ''
    });

    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['creator-campaigns', creator?.id],
        queryFn: async () => {
            if (!creator) return [];
            const { data, error } = await supabase
                .from('campaigns' as any)
                .select('*')
                .eq('creator_id', creator.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data as any) as Campaign[];
        },
        enabled: !!creator
    });

        // Fetch completed donations for these campaigns and compute totals and donor counts client-side
        const campaignIds = (campaigns || []).map(c => c.id);
        const { data: donationSums } = useQuery<Record<string, { total: number; donors: number }>>({
            queryKey: ['campaign-donation-sums', campaignIds.join(',')],
            queryFn: async () => {
                if (!campaignIds || campaignIds.length === 0) return {} as Record<string, { total: number; donors: number }>;
                const { data, error } = await supabase
                    .from('donations')
                    .select('campaign_id, creator_amount')
                    .in('campaign_id', campaignIds)
                    .eq('status', 'completed');
                if (error) throw error;
                const sums: Record<string, { total: number; donors: number }> = {};
                (data || []).forEach((d: any) => {
                    const id = d.campaign_id;
                    const amt = Number(d.creator_amount || 0);
                    if (!sums[id]) sums[id] = { total: 0, donors: 0 };
                    sums[id].total += amt;
                    sums[id].donors += 1;
                });
                return sums;
            },
            enabled: !!campaignIds && campaignIds.length > 0
        });

        // Use donationSums to derive displayed campaign amounts (falls back to stored current_amount)
        const displayedCampaigns = (campaigns || []).map((c: Campaign) => ({
            ...c,
            current_amount: donationSums && donationSums[c.id] ? donationSums[c.id].total : c.current_amount,
            donors_count: donationSums && donationSums[c.id] ? donationSums[c.id].donors : 0
        }));

        // Realtime subscription: listen for any donations changes and invalidate queries so UI updates dynamically
        useEffect(() => {
            if (!campaignIds || campaignIds.length === 0) return;

            const channel = supabase
                .channel('donations-ch')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, (payload: any) => {
                    try {
                        const record = payload.record;
                        if (!record) return;
                        // Only react when the change is for one of our campaigns
                        if (record.campaign_id && campaignIds.includes(record.campaign_id)) {
                            // Invalidate queries so react-query refetches data and the UI reflects the latest totals
                            queryClient.invalidateQueries({ queryKey: ['creator-campaigns', creator?.id] });
                            queryClient.invalidateQueries({ queryKey: ['campaign-donation-sums', campaignIds.join(',')] });
                        }
                    } catch (err) {
                        console.error('donations realtime handler error', err);
                    }
                })
                .subscribe();

            return () => {
                try {
                    supabase.removeChannel(channel);
                } catch (e) {
                    // best-effort cleanup
                }
            };
        }, [campaignIds.join(','), creator?.id]);

    const createCampaign = useMutation({
        mutationFn: async (newCampaign: any) => {
            const { data, error } = await supabase
                .from('campaigns' as any)
                .insert([{
                    ...newCampaign,
                    creator_id: creator?.id,
                    goal_amount: parseFloat(newCampaign.goal_amount),
                    status: 'active'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
            setIsDialogOpen(false);
            resetForm();
            toast.success('Campaign created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create campaign');
        }
    });

    const updateCampaign = useMutation({
        mutationFn: async (updatedCampaign: any) => {
            const { id, ...campaignData } = updatedCampaign;
            const { data, error } = await supabase
                .from('campaigns' as any)
                .update({
                    ...campaignData,
                    goal_amount: parseFloat(updatedCampaign.goal_amount)
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
            setIsDialogOpen(false);
            resetForm();
            toast.success('Campaign updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update campaign');
        }
    });

    const deleteCampaign = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('campaigns' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
            toast.success('Campaign deleted');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete campaign');
        }
    });

    const resetForm = () => {
        setFormData({ title: '', description: '', goal_amount: '', end_date: '', image_url: '' });
        setEditingCampaign(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.goal_amount) {
            toast.error('Title and Goal Amount are required');
            return;
        }

        if (editingCampaign) {
            updateCampaign.mutate({ ...formData, id: editingCampaign.id });
        } else {
            createCampaign.mutate(formData);
        }
    };

    const handleEdit = (campaign: any) => {
        setEditingCampaign(campaign);
        setFormData({
            title: campaign.title,
            description: campaign.description || '',
            goal_amount: campaign.goal_amount.toString(),
            end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
            image_url: campaign.image_url || ''
        });
        setIsDialogOpen(true);
    };

    return (
        <DashboardLayout type="creator">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Crowdfunding</h1>
                        <p className="text-muted-foreground">Raise funds for your projects and creative work</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Campaign
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
                                <DialogDescription>
                                    Share your project goals and invite your tribe to support you.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Campaign Title</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Recording My New Afro-Jazz Album"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="goal">Goal Amount (KES)</Label>
                                        <Input
                                            id="goal"
                                            type="number"
                                            min="1"
                                            value={formData.goal_amount}
                                            onChange={e => setFormData({ ...formData, goal_amount: e.target.value })}
                                            placeholder="100000"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date (Optional)</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={formData.end_date}
                                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        className="min-h-[120px]"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Explain what the funds will be used for..."
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label>Campaign Cover Image</Label>
                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                        <ImageUpload
                                            bucket="products"
                                            currentUrl={formData.image_url}
                                            onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                                        />
                                        <div className="flex-1 space-y-2 w-full">
                                            <Label htmlFor="image_url" className="text-xs text-muted-foreground italic">Or direct Image URL</Label>
                                            <Input
                                                id="image_url"
                                                value={formData.image_url}
                                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                                placeholder="https://example.com/cover.jpg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={createCampaign.isPending || updateCampaign.isPending}>
                                        {createCampaign.isPending || updateCampaign.isPending ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                        ) : (editingCampaign ? 'Save Changes' : 'Launch Campaign')}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="h-48 bg-secondary/50" />
                                <CardContent className="h-32" />
                            </Card>
                        ))}
                    </div>
                ) : campaigns?.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <Target className="w-12 h-12 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-foreground">No campaigns yet</h3>
                            <p className="mb-4">Start your first crowdfunding project today.</p>
                            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                                Launch Your First Campaign
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {displayedCampaigns?.map((campaign) => {
                            const progress = Math.min(100, (Number(campaign.current_amount) / Number(campaign.goal_amount)) * 100);

                            return (
                                <Card key={campaign.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                    <div className="aspect-video bg-secondary relative overflow-hidden">
                                        {campaign.image_url ? (
                                            <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Target className="w-12 h-12 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                            {campaign.status}
                                        </div>
                                    </div>
                                    <CardHeader className="flex-1">
                                        <div className="flex justify-between items-start gap-4 mb-2">
                                            <CardTitle className="text-xl line-clamp-1">{campaign.title}</CardTitle>
                                        </div>
                                        <CardDescription className="line-clamp-2 min-h-[40px]">
                                            {campaign.description || "No description provided."}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <div>
                                                    <div className="font-semibold text-green-600">KES {Number(campaign.current_amount).toLocaleString()}</div>
                                                    <div className="text-xs text-muted-foreground">Raised • {(campaign as any).donors_count || 0} donors</div>
                                                </div>
                                                <span className="text-muted-foreground">Goal: KES {Number(campaign.goal_amount).toLocaleString()}</span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>{Math.round(progress)}% Funded</span>
                                                {campaign.end_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Ends {format(new Date(campaign.end_date), 'MMM d, yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-2"
                                                onClick={() => handleEdit(campaign)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this campaign?')) {
                                                        deleteCampaign.mutate(campaign.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default CreatorCampaigns;
