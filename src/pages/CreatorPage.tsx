import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Heart, Users, Share2, Check, ExternalLink, Loader2, Phone, AlertCircle, CheckCircle2, XCircle, ShoppingBag, Package, Gift as GiftIcon, ShieldCheck, EyeOff, Eye, Target, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NotFound from './NotFound';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import CartSheet from '@/components/CartSheet';

const donationAmounts = [100, 300, 500, 1000];

type PaymentStatus = 'idle' | 'processing' | 'polling' | 'success' | 'failed';

const CreatorPage = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(300);
  const [customAmount, setCustomAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [recordId, setRecordId] = useState('');
  const { addItem } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('support');
  const [isAnonymousGift, setIsAnonymousGift] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [currentTxType, setCurrentTxType] = useState<'donation' | 'gift' | 'campaign'>('donation');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { data: creator, isLoading, error } = useQuery({
    queryKey: ['creator', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select(`
          *,
          category:creator_categories(name, icon)
        `)
        .eq('username', username?.toLowerCase() || '')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!username
  });

  useEffect(() => {
    if ((creator as any)?.featured_section) {
      setActiveTab((creator as any).featured_section);
    }
  }, [creator]);

  const isOwner = !!user && !!creator && user.id === creator.user_id;

  const { data: links } = useQuery({
    queryKey: ['creator-links', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_links')
        .select('*')
        .eq('creator_id', creator!.id)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const { data: merchandise } = useQuery({
    queryKey: ['creator-merch', creator?.id, isOwner],
    queryFn: async () => {
      let query = supabase
        .from('merchandise')
        .select('*')
        .eq('creator_id', creator!.id);

      // If not the owner, only show active and approved merch
      if (!isOwner) {
        query = query.eq('is_active', true).eq('is_approved', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const { data: recentDonations } = useQuery({
    queryKey: ['recent-public-donations', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('donor_name, amount, message, created_at, is_anonymous')
        .eq('creator_id', creator!.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const { data: availableGifts } = useQuery({
    queryKey: ['available-gifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: recentGifts } = useQuery({
    queryKey: ['recent-gifts', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('received_gifts')
        .select(`
          *,
          gift:gifts(name, icon_url)
        `)
        .eq('creator_id', creator!.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const { data: campaigns } = useQuery({
    queryKey: ['creator-campaigns-public', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns' as any)
        .select('*')
        .eq('creator_id', creator!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!creator
  });

  const initiateDonation = useMutation({
    mutationFn: async () => {
      const amount = customAmount ? parseInt(customAmount) : selectedAmount;
      if (!amount || amount < 10) throw new Error('Minimum amount is KSh 10');
      if (!phoneNumber) throw new Error('Phone number is required');

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: phoneNumber,
          amount,
          creatorId: creator!.id,
          donorName: donorName || undefined,
          message: message || undefined,
          type: 'donation'
        }
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'STK Push failed');
      return response.data;
    },
    onSuccess: (data) => {
      setCheckoutRequestId(data.checkoutRequestId);
      setRecordId(data.recordId);
      setCurrentTxType('donation');
      setPaymentStatus('polling');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
      setPaymentDialog(false);
    }
  });

  const initiateGift = useMutation({
    mutationFn: async (gift: any) => {
      if (!phoneNumber) throw new Error('Phone number is required');

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: phoneNumber,
          amount: gift.price,
          creatorId: creator!.id,
          donorName: donorName || undefined,
          type: 'gift',
          referenceId: gift.id,
          metadata: {
            is_anonymous: isAnonymousGift
          }
        }
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'STK Push failed');
      return response.data;
    },
    onSuccess: (data) => {
      setCheckoutRequestId(data.checkoutRequestId);
      setRecordId(data.recordId);
      setCurrentTxType('gift');
      setPaymentStatus('polling');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
      setPaymentDialog(false);
    }
  });

  const initiateCampaignDonation = useMutation({
    mutationFn: async ({ amount, campaignId }: { amount: number, campaignId: string }) => {
      if (!phoneNumber) throw new Error('Phone number is required');

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: phoneNumber,
          amount,
          creatorId: creator!.id,
          campaignId,
          donorName: donorName || undefined,
          message: message || undefined,
          type: 'donation'
        }
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'STK Push failed');
      return response.data;
    },
    onSuccess: (data) => {
      setCheckoutRequestId(data.checkoutRequestId);
      setRecordId(data.recordId);
      setCurrentTxType('donation'); // Using donation as tx type for checking payment
      setPaymentStatus('polling');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
      setPaymentDialog(false);
    }
  });

  // Poll for payment status
  useEffect(() => {
    if (paymentStatus !== 'polling' || !recordId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await supabase.functions.invoke('check-payment', {
          body: { recordId, type: currentTxType }
        });

        if ((response as any).error) {
          console.error('check-payment invoke error', (response as any).error);
          // Keep polling a bit but mark as failed after timeout
          return;
        }

        const successStats = ['completed', 'confirmed', 'processing'];
        if (successStats.includes(response.data?.status)) {
          setPaymentStatus('success');
          clearInterval(pollInterval);
        } else if (response.data?.status === 'failed' || response.data?.status === 'cancelled') {
          setPaymentStatus('failed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error while polling payment status:', err);
        // swallow transient errors and let the timeout handle permanent failures
      }
    }, 2000);

    // Stop polling after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'polling') {
        setPaymentStatus('failed');
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [paymentStatus, recordId, currentTxType]);

  const handleDonate = () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount < 10) {
      toast.error('Minimum amount is KSh 10');
      return;
    }
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }
    setPaymentDialog(true);
    setPaymentStatus('processing');
    initiateDonation.mutate();
  };

  const resetPayment = () => {
    setPaymentDialog(false);
    setPaymentStatus('idle');
    setCheckoutRequestId('');
    setRecordId('');
    if (paymentStatus === 'success') {
      setPhoneNumber('');
      setDonorName('');
      setMessage('');
      setSelectedAmount(300);
      setCustomAmount('');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Support ${creator?.display_name} on TribeYangu`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  const scrollToSupport = () => {
    const element = document.getElementById('support-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    );
  }

  if (error || !creator) {
    return <NotFound />;
  }

  // Safe display name helpers to avoid runtime errors when fields are null/undefined
  const safeDisplayName = creator.display_name || creator.username || 'Creator';
  const safeFirstName = (safeDisplayName.split(' ')[0]) || safeDisplayName;

  // Apply creator theme
  const themeStyles = {
    '--creator-primary': creator.theme_primary || '#E07B4C',
    '--creator-secondary': creator.theme_secondary || '#8B9A6B',
    '--creator-accent': creator.theme_accent || '#D4A853',
  } as React.CSSProperties;

  // Handle non-approved statuses

  if (creator.status !== 'approved' && !isOwner) {
    if (creator.status === 'pending') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <Header />
          <div className="bg-amber-50 p-8 rounded-full mb-6">
            <Loader2 className="w-12 h-12 text-amber-600 animate-spin-slow" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Coming Soon</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            @{creator.username}'s profile is currently under review and will be live shortly.
            Check back soon!
          </p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
          <Footer />
        </div>
      );
    }

    if (creator.status === 'suspended') {
      return <NotFound />;
    }

    // Fallback for rejected or other statuses
    return <NotFound />;
  }

  return (
    <div style={themeStyles}>
      <Header />
      <main className="min-h-screen pt-16">
        {isOwner && creator.status !== 'approved' && (
          <div className="bg-amber-500 text-white text-center py-2 px-4 font-medium relative z-50">
            Preview Mode: Your profile is currently {creator.status}
          </div>
        )}
        {/* Banner */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          {creator.banner_url ? (
            <img src={creator.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${creator.theme_primary || '#E07B4C'}, ${creator.theme_secondary || '#8B9A6B'})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-primary/10 shadow-lg">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt={safeDisplayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary">
                            {safeDisplayName.charAt(0)}
                          </div>
                        )}
                      </div>
                      {creator.is_verified && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: creator.theme_secondary || '#8B9A6B' }}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h1 className="font-display text-2xl md:text-3xl font-bold">{creator.display_name}</h1>
                          <p className="text-muted-foreground">@{creator.username}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                            <Share2 className="w-4 h-4" /> Share
                          </Button>
                          <Button
                            className="gap-2 shadow-md animate-pulse hover:animate-none"
                            size="sm"
                            style={{ backgroundColor: creator.theme_primary }}
                            onClick={scrollToSupport}
                          >
                            <Heart className="w-4 h-4 fill-current" /> Show Love
                          </Button>
                        </div>
                      </div>

                      {creator.tribe_name && (
                        <Badge variant="secondary" className="mb-3">{creator.tribe_name}</Badge>
                      )}

                      <p className="text-muted-foreground mb-4">{creator.bio || 'Welcome to my page!'}</p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" style={{ color: creator.theme_primary }} />
                          <span className="font-semibold">{creator.total_supporters || 0}</span>
                          <span className="text-muted-foreground">supporters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4" style={{ color: creator.theme_primary }} />
                          <span className="font-semibold">KSh {Number(creator.total_raised || 0).toLocaleString()}</span>
                          <span className="text-muted-foreground">raised</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Links */}
              {links && links.length > 0 && (
                <Card className="shadow-sm border-none bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <ExternalLink className="w-5 h-5 text-primary" />
                      Links
                    </h2>
                    <div className="grid gap-3">
                      {links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-all group border border-transparent hover:border-primary/20"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">{link.icon || '🔗'}</span>
                          <span className="font-medium flex-1 group-hover:text-primary transition-colors">{link.title}</span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Crowdfunding Campaigns */}
              {campaigns && campaigns.length > 0 && (
                <div className="space-y-4">
                  <h2 className="font-semibold px-2 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Active Campaigns
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaigns.map((campaign) => {
                      const progress = Math.min(100, (campaign.current_amount / campaign.goal_amount) * 100);
                      return (
                        <Card key={campaign.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="aspect-video bg-secondary relative overflow-hidden">
                            {campaign.image_url ? (
                              <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Target className="w-12 h-12 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <h3 className="font-bold text-lg line-clamp-1">{campaign.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                              {campaign.description || "No description provided."}
                            </p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>KES {Number(campaign.current_amount).toLocaleString()}</span>
                                <span className="text-muted-foreground">Goal: KES {Number(campaign.goal_amount).toLocaleString()}</span>
                              </div>
                              <Progress value={progress} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground text-right">{Math.round(progress)}% raised</p>
                            </div>
                            <Button
                              size="sm"
                              className="w-full"
                              variant="outline"
                              onClick={() => {
                                setActiveTab('campaigns');
                                setSelectedCampaignId(campaign.id);
                                scrollToSupport();
                              }}
                            >
                              Support Campaign
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Store */}
              {merchandise && merchandise.length > 0 && (
                <Card className="shadow-sm border-none bg-card/60 backdrop-blur-sm" id="store-section">
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      {safeFirstName}'s Store
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {merchandise.map((item) => (
                        <div key={item.id} className="group relative rounded-xl overflow-hidden bg-secondary/30 border border-transparent hover:border-primary/20 transition-all flex flex-col">
                          <div className="aspect-square bg-secondary/50 flex items-center justify-center relative">
                            {item.images && (item.images as string[]).length > 0 ? (
                              <img src={(item.images as string[])[0]} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                              <Package className="w-12 h-12 text-muted-foreground/30" />
                            )}
                            {isOwner && !item.is_approved && (
                              <div className="absolute top-2 left-2 px-2 py-1 rounded bg-amber-500/90 text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
                                <AlertCircle className="w-3 h-3" />
                                PENDING APPROVAL
                              </div>
                            )}
                            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-bold backdrop-blur-sm">
                              KES {Number(item.price).toLocaleString()}
                            </div>
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">{item.description || 'No description available'}</p>
                            <Button
                              size="sm"
                              className="w-full h-8 text-[11px] gap-2"
                              style={{ backgroundColor: creator.theme_primary }}
                              disabled={!item.is_active || (!item.is_approved && !isOwner)}
                              onClick={() => {
                                addItem({
                                  id: item.id,
                                  name: item.name,
                                  price: Number(item.price),
                                  quantity: 1,
                                  image: item.images?.[0],
                                  creatorId: creator.id
                                });
                                toast.success(`${item.name} added to cart!`);
                                setIsCartOpen(true);
                              }}
                            >
                              <ShoppingBag className="w-3 h-3" />
                              Add to cart
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Gifts */}
              {recentGifts && recentGifts.length > 0 && (
                <Card className="shadow-sm border-none bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <GiftIcon className="w-5 h-5 text-primary" />
                      Recent Gifts
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {recentGifts.map((received, i) => (
                        <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-secondary/30 text-center animate-in fade-in zoom-in duration-300">
                          <span className="text-3xl mb-1">{(received.gift as any)?.icon_url}</span>
                          <span className="text-[10px] font-bold text-primary uppercase">{(received.gift as any)?.name}</span>
                          <span className="text-[10px] text-muted-foreground mt-1 truncate w-full">
                            From {received.is_anonymous ? 'Anonymous' : (received.sender_name || 'Someone')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Supporters */}
              {recentDonations && recentDonations.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-4">Recent Supporters</h2>
                    <div className="space-y-3">
                      {recentDonations.map((donation, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: creator.theme_primary + '20', color: creator.theme_primary }}>
                            {donation.is_anonymous ? '?' : (donation.donor_name?.charAt(0) || '?')}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{donation.is_anonymous ? 'Anonymous' : (donation.donor_name || 'Someone')}</p>
                              <p className="font-semibold" style={{ color: creator.theme_primary }}>KSh {Number(donation.amount).toLocaleString()}</p>
                            </div>
                            {donation.message && (
                              <p className="text-sm text-muted-foreground mt-1">"{donation.message}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Donation Sidebar */}
            <div className="lg:col-span-1" id="support-section">
              <div className="sticky top-24">
                <Card className="shadow-lg overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: creator.theme_primary }} />
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="support" className="gap-2">
                        <Heart className="w-4 h-4" /> Support
                      </TabsTrigger>
                      <TabsTrigger value="gifts" className="gap-2">
                        <GiftIcon className="w-4 h-4" /> Gifts
                      </TabsTrigger>
                      <TabsTrigger value="store" className="gap-2">
                        <ShoppingBag className="w-4 h-4" /> Store
                      </TabsTrigger>
                      {campaigns && campaigns.length > 0 && (
                        <TabsTrigger value="campaigns" className="gap-2">
                          <Target className="w-4 h-4" /> Campaign
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="support" className="space-y-4">
                      <div className="text-center mb-6">
                        <h2 className="font-display text-xl font-bold">
                          Support {safeFirstName}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your support means everything
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {donationAmounts.map((amount) => (
                          <button
                            key={amount}
                            onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                            className={`py-3 px-4 rounded-xl font-semibold transition-all ${selectedAmount === amount
                              ? 'text-white shadow-lg'
                              : 'bg-secondary text-foreground hover:bg-secondary/80'
                              }`}
                            style={selectedAmount === amount ? { backgroundColor: creator.theme_primary } : undefined}
                          >
                            KSh {amount}
                          </button>
                        ))}
                      </div>

                      <Input
                        type="number"
                        placeholder="Custom amount (KSh)"
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                      />

                      <Textarea
                        placeholder="Leave a message... 💚 (optional)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                      />

                      <Button
                        className="w-full gap-2 text-white"
                        size="lg"
                        style={{ backgroundColor: creator.theme_primary }}
                        onClick={handleDonate}
                        disabled={initiateDonation.isPending}
                      >
                        {initiateDonation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Heart className="w-5 h-5" />
                        )}
                        Support with KSh {customAmount || selectedAmount || 0}
                      </Button>
                    </TabsContent>

                    <TabsContent value="gifts" className="space-y-4">
                      <div className="text-center mb-6">
                        <h2 className="font-display text-xl font-bold">
                          Send a Gift
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Surprise {safeFirstName} with a gift!
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {availableGifts?.map((gift) => (
                          <button
                            key={gift.id}
                            onClick={() => setSelectedGiftId(gift.id)}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedGiftId === gift.id
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-secondary/50 hover:bg-secondary'
                              }`}
                          >
                            <span className="text-2xl">{gift.icon_url}</span>
                            <span className="text-[10px] font-bold truncate w-full text-center">{gift.name}</span>
                            <span className="text-[10px] text-primary font-bold">KSh {gift.price}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/30">
                        <Checkbox
                          id="anon-gift"
                          checked={isAnonymousGift}
                          onCheckedChange={(checked) => setIsAnonymousGift(!!checked)}
                        />
                        <Label htmlFor="anon-gift" className="text-sm cursor-pointer flex items-center gap-2">
                          {isAnonymousGift ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          Send as Anonymous
                        </Label>
                      </div>

                      <Button
                        className="w-full gap-2 text-white"
                        size="lg"
                        style={{ backgroundColor: creator.theme_primary }}
                        disabled={!selectedGiftId || initiateGift.isPending}
                        onClick={() => {
                          const gift = availableGifts?.find(g => g.id === selectedGiftId);
                          if (gift) {
                            if (!phoneNumber) {
                              toast.error('Please enter your M-PESA number');
                              return;
                            }
                            setPaymentDialog(true);
                            setPaymentStatus('processing');
                            initiateGift.mutate(gift);
                          }
                        }}
                      >
                        {initiateGift.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <GiftIcon className="w-5 h-5" />
                        )}
                        Send Gift
                      </Button>
                    </TabsContent>

                    <TabsContent value="campaigns" className="space-y-4">
                      {campaigns && campaigns.length > 0 && (
                        <div className="space-y-4">
                          <div className="text-center mb-6">
                            <h2 className="font-display text-xl font-bold">Back this Campaign</h2>
                            <p className="text-sm text-muted-foreground mt-1">Help {safeFirstName} reach their goal</p>
                          </div>

                          <div className="space-y-2">
                            <Label>Select Campaign</Label>
                            <div className="space-y-2">
                              {campaigns.map(c => (
                                <div
                                  key={c.id}
                                  onClick={() => setSelectedCampaignId(c.id)}
                                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedCampaignId === c.id ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary/50'}`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm">{c.title}</span>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                      {Math.round((c.current_amount / c.goal_amount) * 100)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Amount (KES)</Label>
                            <Input
                              type="number"
                              placeholder="Amount to contribute"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                            />
                          </div>

                          <Button
                            className="w-full gap-2 text-white"
                            size="lg"
                            style={{ backgroundColor: creator.theme_primary }}
                            disabled={!selectedCampaignId || !customAmount || initiateCampaignDonation.isPending}
                            onClick={() => {
                              if (!phoneNumber) {
                                toast.error('Please enter your M-PESA number');
                                return;
                              }
                              setPaymentDialog(true);
                              setPaymentStatus('processing');
                              initiateCampaignDonation.mutate({
                                amount: parseInt(customAmount),
                                campaignId: selectedCampaignId!
                              });
                            }}
                          >
                            {initiateCampaignDonation.isPending ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Target className="w-5 h-5" />
                            )}
                            Contribute KSh {customAmount || 0}
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="store" className="space-y-4">
                      <div className="text-center mb-6">
                        <h2 className="font-display text-xl font-bold">Visit the Store</h2>
                        <p className="text-sm text-muted-foreground mt-1">Check out my latest merchandise</p>
                      </div>
                      <div className="space-y-3">
                        {merchandise?.slice(0, 3).map(item => (
                          <div key={item.id} className="flex gap-3 p-2 rounded-lg bg-secondary/30 items-center">
                            <div className="w-12 h-12 rounded bg-secondary flex-shrink-0 overflow-hidden">
                              {item.images?.[0] ? (
                                <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-6 h-6 m-3 opacity-20" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{item.name}</p>
                              <p className="text-xs text-primary font-bold">KES {item.price}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => {
                              addItem({
                                id: item.id,
                                name: item.name,
                                price: Number(item.price),
                                quantity: 1,
                                image: item.images?.[0],
                                creatorId: creator.id
                              });
                              toast.success(`${item.name} added!`);
                              setIsCartOpen(true);
                            }}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => {
                        document.getElementById('store-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}>
                        View Full Store
                      </Button>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 space-y-4 pt-6 border-t">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="M-PESA number (07...)"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Input
                      placeholder="Your name (optional)"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                    />
                  </div>

                  <p className="text-xs text-center text-muted-foreground mt-4">
                    Secure payment via M-PESA STK Push
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={(open) => !open && resetPayment()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentStatus === 'processing' && 'Initiating Payment...'}
              {paymentStatus === 'polling' && 'Waiting for Payment...'}
              {paymentStatus === 'success' && 'Payment Successful!'}
              {paymentStatus === 'failed' && 'Payment Failed'}
            </DialogTitle>
            <DialogDescription>
              {paymentStatus === 'processing' && 'Please wait while we send the STK push to your phone.'}
              {paymentStatus === 'polling' && 'Check your phone and enter your M-PESA PIN.'}
              {paymentStatus === 'success' && 'Your support has been recorded.'}
              {paymentStatus === 'failed' && 'The payment could not be completed at this time.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 text-center">
            {(paymentStatus === 'processing' || paymentStatus === 'polling') && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  {paymentStatus === 'processing'
                    ? 'Sending STK Push to your phone...'
                    : 'Please complete the payment on your phone'}
                </p>
                {paymentStatus === 'polling' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Check your phone for the M-PESA prompt
                  </p>
                )}
              </>
            )}

            {paymentStatus === 'success' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Thank You!</h3>
                <p className="text-muted-foreground">
                  Your support means everything to {creator.display_name}! 💚
                </p>
              </>
            )}

            {paymentStatus === 'failed' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Payment Failed</h3>
                <p className="text-muted-foreground">
                  The payment was not completed. Please try again.
                </p>
              </>
            )}
          </div>

          {(paymentStatus === 'success' || paymentStatus === 'failed') && (
            <Button onClick={resetPayment} className="w-full">
              {paymentStatus === 'success' ? 'Done' : 'Try Again'}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorPage;
