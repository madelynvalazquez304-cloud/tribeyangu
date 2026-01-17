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
    console.log('M-PESA Callback Body:', JSON.stringify(body));

    const { Body } = body;
    if (!Body?.stkCallback) {
      console.log('No stkCallback in body');
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
    }

    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    console.log(`Processing M-PESA Callback: ${CheckoutRequestID}, Result: ${ResultCode}`);

    // Find the record by CheckoutRequestID with a small retry logic for race conditions
    async function findRecord(requestId: string) {
      const tables: ('donations' | 'votes' | 'orders' | 'received_gifts')[] = ['donations', 'votes', 'orders', 'received_gifts'];
      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .select('*')
          .eq('payment_reference', requestId)
          .maybeSingle();
        if (data) return { record: data, table };
      }
      return { record: null, table: 'donations' as const };
    }

    let { record, table } = await findRecord(CheckoutRequestID);

    // If not found, wait 2 seconds and try again (race condition handling)
    if (!record) {
      console.log('Record not found initially, retrying in 2s...', CheckoutRequestID);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retry = await findRecord(CheckoutRequestID);
      record = retry.record;
      table = retry.table;
    }

    if (!record) {
      console.log('Record not found after retry for CheckoutRequestID:', CheckoutRequestID);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
    }

    console.log(`Found record in ${table} table: ${record.id}`);

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
      } else if (table === 'votes') {
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
      } else if (table === 'orders') {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'processing',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        if (updateError) {
          console.error('Error updating order status:', updateError);
          throw updateError;
        }

        console.log('Order status updated to processing');

        // Create transaction record for order
        try {
          const { error: transError } = await supabase.from('transactions').insert({
            creator_id: record.creator_id,
            type: 'merchandise',
            amount: record.total,
            fee: record.platform_fee,
            net_amount: record.creator_amount,
            status: 'completed',
            payment_provider: 'mpesa',
            payment_reference: mpesaReceipt,
            reference_type: 'order',
            reference_id: record.id,
            description: `Order from ${record.customer_name || 'Anonymous'}`
          });

          if (transError) console.error('Error creating order transaction:', transError);
          else console.log('Order transaction record created');
        } catch (e) {
          console.error('Exception creating order transaction:', e);
        }
      } else if (table === 'received_gifts') {
        const { error: updateError } = await supabase
          .from('received_gifts')
          .update({
            status: 'completed',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        if (updateError) throw updateError;

        // Create transaction record for gift
        const { error: transError } = await supabase.from('transactions').insert({
          creator_id: record.creator_id,
          type: 'gift',
          amount: record.amount,
          fee: record.platform_fee,
          net_amount: record.creator_amount,
          status: 'completed',
          payment_provider: 'mpesa',
          payment_reference: mpesaReceipt,
          reference_type: 'gift',
          reference_id: record.id,
          description: `Gift from ${record.sender_name || 'Anonymous'}`
        });

        if (transError) console.error('Error creating gift transaction:', transError);
      }
    } else {
      // Payment failed
      console.log(`Payment failed with ResultCode: ${ResultCode}. Updating status...`);
      const failedStatus = table === 'orders' ? 'cancelled' : 'failed';
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: failedStatus })
        .eq('id', record.id);

      if (updateError) console.error(`Error updating failed status for ${table}:`, updateError);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
  } catch (error: any) {
    console.error('Callback Error:', error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
  }
});
