import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    console.log('Checking database...');

    const { data: campaignData, error: campaignError } = await supabase.from('campaigns').select('count').limit(1);
    if (campaignError) {
        console.error('Campaigns table missing or inaccessible:', campaignError.message);
    } else {
        console.log('Campaigns table exists.');
    }

    const { data: creatorData, error: creatorError } = await supabase.from('creators').select('featured_section').limit(1);
    if (creatorError) {
        console.error('creators.featured_section missing or inaccessible:', creatorError.message);
    } else {
        console.log('creators.featured_section exists.');
    }

    const { data: platformData, error: platformError } = await supabase.from('platform_settings').select('key, value').eq('key', 'hero_stats').maybeSingle();
    if (platformError) {
        console.error('platform_settings table or hero_stats key missing:', platformError.message);
    } else {
        console.log('hero_stats in platform_settings:', platformData ? 'Found' : 'Not found');
    }
}

check();
