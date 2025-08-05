import { createClient } from '@supabase/supabase-js';

// Optional Supabase - system works without database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client with fallback values (system works without database)
export const supabase = createClient(supabaseUrl, supabaseKey); 