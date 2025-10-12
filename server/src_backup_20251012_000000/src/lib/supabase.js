// client/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ✅ Use environment variables (DO NOT hardcode keys in production)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
