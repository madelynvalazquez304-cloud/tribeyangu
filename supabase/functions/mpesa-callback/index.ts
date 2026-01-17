import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { Body } = body;

    if (!Body?.stkCallback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
    }

    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    console.log('M-PESA Callback:', { CheckoutRequestID, ResultCode, ResultDesc });

    // Find the record by CheckoutRequestID
    let record: any = null;
    let table: 'donations' | 'votes' = 'donations';

    // Try donations first
    const { data: donation } = await supabase
      .from('donations')
      .select('*')
      .eq('payment_reference', CheckoutRequestID)
      .single();

    if (donation) {
      record = donation;
      table = 'donations';
    } else {
      // Try votes
      const { data: vote } = await supabase
        .from('votes')
        .select('*')
        .eq('payment_reference', CheckoutRequestID)
        .single();

      if (vote) {
        record = vote;
        table = 'votes';
      }
    }

    if (!record) {
      console.log('Record not found for CheckoutRequestID:', CheckoutRequestID);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
    }

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceipt = '';
      let amount = 0;

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
          if (item.Name === 'Amount') amount = item.Value;
        }
      }

      if (table === 'donations') {
        const { error: updateError } = await supabase
          .from('donations')
          .update({
            status: 'completed',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        if (updateError) throw updateError;

        // Create transaction record
        const { error: transError } = await supabase.from('transactions').insert({
          creator_id: record.creator_id,
          type: 'donation',
          amount: record.amount,
          fee: record.platform_fee,
          net_amount: record.creator_amount,
          status: 'completed',
          payment_provider: 'mpesa',
          payment_reference: mpesaReceipt,
          reference_type: 'donation',
          reference_id: record.id,
          description: `Donation from ${record.donor_name || 'Anonymous'}`
        });

        if (transError) throw transError;
      } else {
        const { error: updateError } = await supabase
          .from('votes')
          .update({
            status: 'confirmed',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        if (updateError) throw updateError;

        // Create transaction record for votes
        const { data: nominee } = await supabase
          .from('award_nominees')
          .select('creator_id')
          .eq('id', record.nominee_id)
          .single();

        if (nominee) {
          const { error: transError } = await supabase.from('transactions').insert({
            creator_id: nominee.creator_id,
            type: 'vote',
            amount: record.amount_paid,
            fee: record.platform_fee,
            net_amount: record.amount_paid - record.platform_fee,
            status: 'completed',
            payment_provider: 'mpesa',
            payment_reference: mpesaReceipt,
            reference_type: 'vote',
            reference_id: record.id,
            description: `Votes from ${record.voter_phone || 'Anonymous'}`
          });

          if (transError) console.error('Error creating vote transaction:', transError);
        }
      }
    } else {
      // Payment failed
      await supabase
        .from(table)
        .update({ status: 'failed' })
        .eq('id', record.id);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
  } catch (error: any) {
    console.error('Callback Error:', error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
  }
});
