
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bxejimwkqnhayctzwubc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZWppbXdrcW5oYXljdHp3dWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTA3NzksImV4cCI6MjA4MDUyNjc3OX0.E6D-SrAKfrrXmvi2GjXOhBP7ZGdIyuDCTwq-81YFhBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  }
});
