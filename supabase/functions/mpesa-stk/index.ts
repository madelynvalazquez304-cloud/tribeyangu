import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface STKPushRequest {
  phone: string;
  amount: number;
  creatorId: string;
  donorName?: string;
  message?: string;
  type: 'donation' | 'vote' | 'merchandise';
  referenceId?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', message: 'M-PESA STK Function is alive' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: STKPushRequest = await req.json();
    const { phone, amount, creatorId, donorName, message, type, referenceId, metadata } = body;

    // Get active M-PESA config
    console.log('Fetching M-PESA config...');
    const { data: configs, error: configError } = await supabase
      .from('payment_configs')
      .select('config, is_primary')
      .eq('provider', 'mpesa')
      .eq('is_active', true);

    if (configError || !configs || configs.length === 0) {
      console.error('M-PESA config error:', configError || 'No active config found');
      return new Response(
        JSON.stringify({ error: 'M-PESA not configured. Please add an active M-Pesa config in the Admin Panel.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prioritize primary config, fallback to first active
    const activeConfigRecord = configs.find(c => c.is_primary) || configs[0];
    const mpesaConfig = activeConfigRecord.config as any;
    console.log('Using M-PESA config for:', mpesaConfig.paybill, 'Environment:', mpesaConfig.environment);

    // Get platform fees from settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['platform_fee_percentage', 'vote_fee_percentage']);

    const donationFeePerc = Number(settings?.find(s => s.key === 'platform_fee_percentage')?.value || 5) / 100;
    const voteFeePerc = Number(settings?.find(s => s.key === 'vote_fee_percentage')?.value || 15) / 100;
    const merchFeePerc = Number(settings?.find(s => s.key === 'merch_fee_percentage')?.value || 10) / 100;

    // Determine base URL based on environment
    const baseUrl = mpesaConfig.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    // Get OAuth token
    console.log('Requesting OAuth token from Safaricom...');
    const auth = btoa(`${mpesaConfig.consumer_key}:${mpesaConfig.consumer_secret}`);
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Safaricom Auth Error:', errText);
      throw new Error('Failed to get M-PESA token. Check your Consumer Key and Secret.');
    }

    const { access_token } = await tokenResponse.json();

    // Format phone number (254...)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = btoa(`${mpesaConfig.paybill}${mpesaConfig.passkey}${timestamp}`);

    // Create pending donation/vote/order record
    console.log('Creating pending record in DB for type:', type);
    let recordId: string;

    let feePerc = donationFeePerc;
    if (type === 'vote') feePerc = voteFeePerc;
    if (type === 'merchandise') feePerc = merchFeePerc;

    const platformFee = amount * feePerc;
    const creatorAmount = amount - platformFee;

    if (type === 'donation') {
      const { data: donation, error } = await supabase
        .from('donations')
        .insert({
          creator_id: creatorId,
          amount,
          donor_name: donorName || null,
          donor_phone: formattedPhone,
          message: message || null,
          payment_provider: 'mpesa',
          platform_fee: platformFee,
          creator_amount: creatorAmount,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('DB Insert Error (donation):', error);
        throw error;
      }
      recordId = donation.id;
    } else if (type === 'merchandise') {
      // Order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          creator_id: creatorId,
          customer_name: donorName || 'Guest',
          customer_phone: formattedPhone,
          shipping_address: metadata?.address ? { address: metadata.address } : null,
          subtotal: amount,
          total: amount,
          platform_fee: platformFee,
          creator_amount: creatorAmount,
          payment_provider: 'mpesa',
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('DB Insert Error (order):', error);
        throw error;
      }
      recordId = order.id;

      // Insert order items if metadata has them
      if (metadata && metadata.items) {
        const orderItems = metadata.items.map((item: any) => ({
          order_id: recordId,
          merchandise_id: item.id,
          quantity: item.qty,
          unit_price: item.unit_price || (amount / metadata.items.length),
          total_price: (item.unit_price || (amount / metadata.items.length)) * item.qty
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) console.error('Error inserting order items:', itemsError);
      }
    } else {
      // Vote
      const { data: vote, error } = await supabase
        .from('votes')
        .insert({
          nominee_id: referenceId,
          amount_paid: amount,
          vote_count: Math.floor(amount / 10), // KSh 10 per vote
          voter_phone: formattedPhone,
          payment_provider: 'mpesa',
          platform_fee: platformFee,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('DB Insert Error (vote):', error);
        throw error;
      }
      recordId = vote.id;
    }

    // Initiate STK Push
    console.log('Initiating STK Push for record:', recordId);
    const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;
    const transactionType = mpesaConfig.mpesa_type === 'buygoods' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline';

    const stkPushBody = {
      BusinessShortCode: mpesaConfig.paybill,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: Math.floor(amount),
      PartyA: formattedPhone,
      PartyB: mpesaConfig.paybill,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `TY${recordId.slice(0, 8)}`,
      TransactionDesc: type === 'donation' ? 'TribeYangu Donation' : (type === 'vote' ? 'TribeYangu Vote' : 'TribeYangu Order')
    };

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushBody)
    });

    const stkResult = await stkResponse.json();

    if (stkResult.ResponseCode === '0') {
      // Update record with checkout request ID
      let table = 'donations';
      if (type === 'vote') table = 'votes';
      if (type === 'merchandise') table = 'orders';

      await supabase
        .from(table)
        .update({ payment_reference: stkResult.CheckoutRequestID })
        .eq('id', recordId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'STK Push sent. Check your phone.',
          checkoutRequestId: stkResult.CheckoutRequestID,
          recordId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Delete the pending record
      let table = 'donations';
      if (type === 'vote') table = 'votes';
      if (type === 'merchandise') table = 'orders';

      await supabase.from(table).delete().eq('id', recordId);

      return new Response(
        JSON.stringify({ error: stkResult.errorMessage || 'STK Push failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
