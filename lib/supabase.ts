import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL 또는 Key가 .env.local에 설정되지 않았습니다.');
}

// 이 'export' 문구가 있어야 page.tsx에서 불러올 수 있습니다.
export const supabase = createClient(supabaseUrl, supabaseKey);