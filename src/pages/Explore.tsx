import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, Sparkles, Users, Heart, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const Explore = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: featuredCreators, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select(`*, category:creator_categories(name)`)
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('total_supporters', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    }
  });

  const { data: creators, isLoading: loadingCreators } = useQuery({
    queryKey: ['explore-creators', search, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('creators')
        .select(`*, category:creator_categories(name)`)
        .eq('status', 'approved')
        .eq('is_featured', false) // Exclude featured to avoid duplicates, or keep them? Let's hide dupes if they are in featured list
        .order('total_supporters', { ascending: false });

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,bio.ilike.%${search}%`);
      }

      if (selectedCategory && selectedCategory !== 'All') {
        const { data: cat } = await supabase.from('creator_categories').select('id').eq('name', selectedCategory).single();
        if (cat) {
          query = query.eq('category_id', cat.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-16">

        {/* Hero / Featured Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h1 className="text-2xl font-bold font-display">Featured Creators</h1>
          </div>

          {loadingFeatured ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : featuredCreators?.length === 0 ? (
            <div className="text-center py-12 bg-secondary/30 rounded-3xl">
              <p className="text-muted-foreground">Check back soon for featured creators!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCreators?.map((creator) => (
                <Link key={creator.id} to={`/${creator.username}`} className="group">
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
                    <CardContent className="p-0">
                      <div className="relative h-48">
                        {creator.banner_url ? (
                          <img src={creator.banner_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ background: `linear-gradient(135deg, ${creator.theme_primary || '#E07B4C'}, ${creator.theme_secondary || '#8B9A6B'})` }}
                          />
                        )}
                        <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-md bg-white">
                          {creator.avatar_url ? (
                            <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-xl font-bold text-primary">
                              {creator.display_name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pt-12 px-6 pb-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{creator.display_name}</h3>
                            <p className="text-sm text-muted-foreground">@{creator.username}</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">
                            Featured
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                          {creator.bio || 'Ready to connect with my tribe!'}
                        </p>
                        <div className="flex items-center gap-4 text-sm font-medium">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{creator.total_supporters}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Heart className="w-4 h-4" />
                            <span>KSh {Number(creator.total_raised).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Discovery Section */}
        <section className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold font-display">Discover Tribes</h2>

            <div className="flex w-full md:w-auto gap-2">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  className="pl-10 rounded-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex overflow-x-auto pb-4 gap-2 mb-6 scrollbar-hide">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              className="rounded-full flex-shrink-0"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories?.map((cat: any) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.name ? "default" : "outline"}
                className="rounded-full flex-shrink-0"
                onClick={() => setSelectedCategory(cat.name)}
              >
                <span>{cat.icon}</span>
                <span className="ml-2">{cat.name}</span>
              </Button>
            ))}
          </div>

          {loadingCreators ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ) : creators?.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No creators found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
              <Button
                variant="link"
                onClick={() => { setSearch(''); setSelectedCategory(null); }}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {creators?.map((creator) => (
                <Link key={creator.id} to={`/${creator.username}`} className="group">
                  <Card className="overflow-hidden border hover:border-primary/50 transition-all duration-300 h-full">
                    <CardContent className="p-0">
                      <div className="relative h-32 bg-secondary">
                        {creator.banner_url ? (
                          <img src={creator.banner_url} alt="" className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ background: `linear-gradient(135deg, ${creator.theme_primary || '#E07B4C'}, ${creator.theme_secondary || '#8B9A6B'})` }}
                          />
                        )}
                        <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-xl border-2 border-white overflow-hidden shadow-sm bg-white">
                          {creator.avatar_url ? (
                            <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-lg font-bold text-primary">
                              {creator.display_name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pt-8 px-4 pb-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">{creator.display_name}</h3>
                          <p className="text-xs text-muted-foreground">@{creator.username}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8">
                          {creator.bio || 'Content Creator'}
                        </p>
                        <div className="flex items-center justify-between text-xs font-medium pt-2 border-t">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{creator.total_supporters || 0}</span>
                          </div>
                          {creator.category?.name && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                              {creator.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

        </section>
      </main>
      <Footer />
    </>
  );
};

export default Explore;
