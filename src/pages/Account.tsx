import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, User as UserIcon, LogOut, Heart, Trophy, Crown, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import CreatorApplicationForm from '@/components/CreatorApplicationForm';
import { Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
}

interface CreatorStatus {
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string;
}

const Account = () => {
  const { user, signOut, roles } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<CreatorStatus | null>(null);
  const [showCreatorForm, setShowCreatorForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, phone, email')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);

        // Check creator status
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select('status, rejection_reason')
          .eq('user_id', user.id)
          .maybeSingle();

        if (creatorData) {
          setCreatorInfo(creatorData as CreatorStatus);
        }
      } catch (error: any) {
        console.error('Error loading profile:', error.message);
        toast.error('Could not load profile data');
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
            <p className="text-muted-foreground">Manage your profile and settings</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {profile?.full_name ? getInitials(profile.full_name) : <UserIcon className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{profile?.full_name || 'User'}</CardTitle>
              <CardDescription>{profile?.email || user?.email}</CardDescription>
              <div className="flex gap-2 mt-2">
                {roles.map((role) => (
                  <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Phone Number</span>
                <p className="text-base">{profile?.phone || 'Not set'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                <p className="text-base">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Become Creator / Status Section */}
          <div className="md:col-span-3">
            {showCreatorForm ? (
              <CreatorApplicationForm
                onSuccess={() => {
                  setShowCreatorForm(false);
                  setCreatorInfo({ status: 'pending' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onCancel={() => setShowCreatorForm(false)}
              />
            ) : (
              <>
                {!roles.includes('creator') && !creatorInfo && (
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardHeader>
                      <Crown className="w-8 h-8 text-primary mb-2" />
                      <CardTitle>Become a Creator</CardTitle>
                      <CardDescription>
                        Start your journey, accept donations, and grow your tribe.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        onClick={() => setShowCreatorForm(true)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Get Started
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {creatorInfo?.status === 'pending' && (
                  <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <AlertTitle className="ml-2 text-lg font-semibold text-yellow-900">Application Pending</AlertTitle>
                    <AlertDescription className="ml-2 mt-1 text-yellow-800/90">
                      Your creator application has been submitted and is currently under review by our admin team.
                      You will be notified once it is approved.
                    </AlertDescription>
                  </Alert>
                )}

                {creatorInfo?.status === 'rejected' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Application Rejected</AlertTitle>
                    <AlertDescription>
                      Your application was not approved.
                      {creatorInfo.rejection_reason && <p className="mt-2 font-medium">Reason: {creatorInfo.rejection_reason}</p>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreatorForm(true)}
                        className="mt-4 bg-background hover:bg-background/90"
                      >
                        Try Again
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          {!showCreatorForm && roles.includes('creator') && (
            // If already a creator, show stats or quick links here (optional extension point)
            <div className="md:col-span-3">
              {/* This space intentionally left blank or for future creator stats */}
            </div>
          )}

          {/* Donations (Placeholder) */}
          <Card>
            <CardHeader>
              <Heart className="w-8 h-8 text-rose-500 mb-2" />
              <CardTitle>My Donations</CardTitle>
              <CardDescription>
                View your donation history and impact.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardFooter>
          </Card>

          {/* Votes (Placeholder) */}
          <Card>
            <CardHeader>
              <Trophy className="w-8 h-8 text-amber-500 mb-2" />
              <CardTitle>My Votes</CardTitle>
              <CardDescription>
                See who you've supported in awards.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardFooter>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Account;
