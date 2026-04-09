import { createClient } from '@supabase/supabase-js'

export const SUPA_URL = 'https://xrlnaoiuahqfpabdgcek.supabase.co'
export const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybG5hb2l1YWhxZnBhYmRnY2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzkzMjksImV4cCI6MjA5MTA1NTMyOX0.q1HytY8QKtaAE6ZmUxTnLMhzkuQumRvDxQa2CAKTS4E'

export const supabase = createClient(SUPA_URL, SUPA_KEY)