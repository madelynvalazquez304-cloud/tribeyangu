import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const CreatorAnalytics = () => {
  const { user } = useAuth();

  const { data: creator, isLoading: loadingCreator } = useQuery({
    queryKey: ['me-creator'],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['creator-analytics', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('creator_analytics')
        .select('*')
        .eq('creator_id', creator.id)
        .order('day', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!creator
  });

  if (loadingCreator || loadingAnalytics) {
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

  if (!creator) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <Card className="p-6">
            <CardContent>
              <p>You do not have a creator profile yet. Create one from your dashboard.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  const totals = (analytics || []).reduce(
    (acc: any, row: any) => {
      acc.views += Number(row.views || 0);
      acc.unique_visitors += Number(row.unique_visitors || 0);
      acc.clicks += Number(row.clicks || 0);
      acc.donations_count += Number(row.donations_count || 0);
      acc.donations_amount += Number(row.donations_amount || 0);
      return acc;
    },
    { views: 0, unique_visitors: 0, clicks: 0, donations_count: 0, donations_amount: 0 }
  );

  return (
    <div>
      <Header />
      <main className="min-h-screen pt-16">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Analytics — {creator.display_name || creator.username}</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Total views</div>
                <div className="text-2xl font-bold">{totals.views}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Unique visitors</div>
                <div className="text-2xl font-bold">{totals.unique_visitors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Donations</div>
                <div className="text-2xl font-bold">{totals.donations_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Donation amount</div>
                <div className="text-2xl font-bold">KSh {Number(totals.donations_amount).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent>
              <h2 className="font-semibold mb-3">Recent (by day)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="p-2">Date</th>
                      <th className="p-2">Views</th>
                      <th className="p-2">Uniques</th>
                      <th className="p-2">Clicks</th>
                      <th className="p-2">Donations</th>
                      <th className="p-2">Amount</th>
                      <th className="p-2">Top sources</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics || []).map((row: any) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2 align-top">{new Date(row.day).toLocaleDateString()}</td>
                        <td className="p-2 align-top">{row.views}</td>
                        <td className="p-2 align-top">{row.unique_visitors}</td>
                        <td className="p-2 align-top">{row.clicks}</td>
                        <td className="p-2 align-top">{row.donations_count}</td>
                        <td className="p-2 align-top">KSh {Number(row.donations_amount).toLocaleString()}</td>
                        <td className="p-2 align-top break-words" style={{maxWidth:200}}>{JSON.stringify(row.top_sources || {})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreatorAnalytics;
