import React, { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, Plus, Calendar, MapPin, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import { toast } from 'sonner';
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

const CreatorEvents = () => {
  const { data: creator } = useMyCreator();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    ticket_price: '0',
    ticket_quantity: '100'
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['creator-events', creator?.id],
    queryFn: async () => {
      if (!creator) return [];

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', creator.id)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch ticket types for these events to display price
      const eventIds = eventsData.map(e => e.id);
      const { data: ticketsData } = await supabase
        .from('ticket_types')
        .select('event_id, price')
        .in('event_id', eventIds);

      // Combine data
      return eventsData.map(event => ({
        ...event,
        price: ticketsData?.find(t => t.event_id === event.id)?.price || 0
      }));
    },
    enabled: !!creator
  });

  const createEvent = useMutation({
    mutationFn: async (newEvent: any) => {
      // 1. Create Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert([{
          title: newEvent.title,
          description: newEvent.description,
          event_date: newEvent.event_date,
          location: newEvent.location,
          creator_id: creator?.id,
          status: 'pending' // Valid status
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Create Default Ticket Type
      const { error: ticketError } = await supabase
        .from('ticket_types')
        .insert([{
          event_id: eventData.id,
          name: 'General Admission',
          price: parseFloat(newEvent.ticket_price) || 0,
          quantity_available: parseInt(newEvent.ticket_quantity) || 100
        }]);

      if (ticketError) throw ticketError;

      return eventData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-events'] });
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        event_date: '',
        location: '',
        ticket_price: '0',
        ticket_quantity: '100'
      });
      toast.success('Event and tickets created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create event');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date) {
      toast.error('Title and Date are required');
      return;
    }
    createEvent.mutate(formData);
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">Create and manage your events</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>Setup a new event and tickets.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Live Concert"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date & Time</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={formData.event_date}
                      onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location / Venue</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. KICC"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">Ticket Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (KES)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        value={formData.ticket_price}
                        onChange={e => setFormData({ ...formData, ticket_price: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity Available</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.ticket_quantity}
                        onChange={e => setFormData({ ...formData, ticket_quantity: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Event details..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createEvent.isPending}>
                    {createEvent.isPending ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : events?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Ticket className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No Events Yet</h3>
              <p className="mb-4">Create your first event to start selling tickets</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                Create Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events?.map((event: any) => (
              <div key={event.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Ticket className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {event.event_date ? format(new Date(event.event_date), 'PPP p') : 'TBD'}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                      <Badge variant="outline" className="ml-1">
                        {event.price && event.price > 0 ? `KES ${event.price}` : 'Free'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <Badge variant={event.status === 'live' || event.status === 'approved' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreatorEvents;
