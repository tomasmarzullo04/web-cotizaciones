import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin
    const allParams = Object.fromEntries(requestUrl.searchParams.entries())

    console.log(`[Auth Callback] Params received:`, allParams)

    if (!code) {
        // Fallback for error descriptions
        const errorDescription = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error')
        const msg = errorDescription ? `Provider Error: ${errorDescription}` : "Validation failed: No code received. Check your Redirect URL config."

        // Return to login with specific error
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`)
    }

    const cookieStore = await cookies()

    // Create a Supabase client configured to use cookies
    // Hardcoded fallbacks to match app/login/page.tsx and ensure consistency
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcajouecfyhcpbazxjhy.supabase.co"
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_NDFtz_7ldXuNu3yP3ZsVfA_te2fF1_S"

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.delete({ name, ...options })
                },
            },
        }
    )

    // Exchange the code for a session
    // This will verify the PKCE verifier stored in the cookies
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error("[Auth] Code Exchange Error:", error)
        return NextResponse.redirect(`${origin}/login?error=Exchange Failed: ${encodeURIComponent(error.message)}`)
    }

    if (!data.session?.user?.email) {
        console.error("[Auth] No email in session")
        return NextResponse.redirect(`${origin}/login?error=No Email provided by Google`)
    }

    const email = data.session.user.email
    const fullName = data.session.user.user_metadata?.full_name || email.split('@')[0]

    let user = null

    try {
        console.log(`[DB-CHECK] Escribiendo en proyecto: gcajouecfyhcpbazxjhy`)

        // 3. User Sync (Upsert Strategy) - STRICT SYNC
        // We use the Supabase User ID as the Prisma Primary Key
        try {
            console.log(`[AUTH] Sincronizando usuario verificado: ${email}`)

            user = await prisma.user.upsert({
                where: { email: email },
                update: {}, // No updates, just ensure existence
                create: {
                    id: data.session.user.id, // CRITICAL: Use Supabase ID
                    name: fullName,
                    email: email,
                    password: '', // Managed by Supabase
                    role: 'USER',
                }
            })

            console.log(`[DB] Éxito: Usuario persistido ID=${user.id}`)

        } catch (dbError: any) {
            console.error("[Auth] Database Sync Error:", dbError)
            return NextResponse.redirect(`${origin}/login?error=Error BD: ${encodeURIComponent(dbError.message)}`)
        }

        // Set App-Specific Session Cookies
        if (user) {
            const cookieOptions = {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const
            }

            cookieStore.set('session_role', user.role, cookieOptions)
            cookieStore.set('session_user', user.name || user.email, cookieOptions)
            cookieStore.set('session_user_id', user.id, cookieOptions)

            return NextResponse.redirect(`${origin}/quote/new`)
        }

        return NextResponse.redirect(`${origin}/login?error=Unknown Auth State`)
    }
