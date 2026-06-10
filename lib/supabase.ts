import { createClient } from '@supabase/supabase-js'

// Use placeholders during build if env vars not present (Vercel will provide them at build time)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMH0.placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
