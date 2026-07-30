// See https://kit.svelte.dev/docs/types#app
import type { SupabaseClient, User } from '@supabase/supabase-js'

declare global {
    namespace App {
        interface Locals {
            supabase: SupabaseClient
            user: User | null
        }
        // interface Error {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {}
