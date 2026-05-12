import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nxozpnfnuphvotitgefq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54b3pwbmZudXBodm90aXRnZWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjY0MzAsImV4cCI6MjA5Mjg0MjQzMH0.F3d61UXVW8TGwbGNBbT45EoQgTppjJ2UG2Ah6XKvhRk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)