'use client'

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase.types'

export const supabase = createPagesBrowserClient<Database>() 