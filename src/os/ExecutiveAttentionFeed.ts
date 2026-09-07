import { supabase } from '../../lib/supabase';

export async function getExecutiveAttentionFeed() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_get_executive_attention_feed');
  if (error) throw error;
  return data;
}
