import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

// ... imports

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin
    // const next = requestUrl.searchParams.get('next') || '/quote/new' // Force quote/new as per user rule

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=Invalid Auth Link`)
    }

    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            get(name: string) { return cookieStore.get(name)?.value },
            set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
            remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }) },
        },
    })

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        return NextResponse.redirect(`${origin}/login?error=Auth Error: ${encodeURIComponent(error.message)}`)
    }

    if (!data.session?.user) {
        return NextResponse.redirect(`${origin}/login?error=No session created`)
    }

    const { user } = data.session
    const email = user.email

    if (!email) {
        return NextResponse.redirect(`${origin}/login?error=No email provided`)
    }

    // BLINDAJE GOOGLE OAUTH & SYNC
    // If usage of Google, we might not have a DB user yet. We MUST create one.
    // If usage of Email, we already created one in registerAction, but we confirm here.
    let dbUser;
    try {
        const fullName = user.user_metadata?.full_name || email.split('@')[0]

        dbUser = await prisma.user.upsert({
            where: { email },
            update: {
                // If they exist, we ensure ID matches (in case of legacy migration fixing)
                id: user.id
            },
            create: {
                id: user.id,
                email,
                name: fullName,
                password: '', // Managed by Supabase
                role: 'CONSULTOR', // Default for Google/new users
            }
        })
    } catch (dbError) {
        console.error("DB Sync Error in Callback:", dbError)
        // SECURITY: If we can't sync to our logic DB, we DO NOT let them in.
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=Database Sync Failed. Contact Support.`)
    }

    // Session is valid, DB is synced.
    // Set our custom cookies for middleware/client ease using the upserted user record
    if (dbUser) {
        const cookieOptions = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
        cookieStore.set('session_role', dbUser.role, cookieOptions)
        cookieStore.set('session_user', dbUser.name, cookieOptions)
        cookieStore.set('session_user_id', dbUser.id, cookieOptions)
    }

    // FORCE REDIRECT TO PORTAL BASED ON ROLE FROM DB (Hardcoded Production Targets)
    const role = dbUser?.role || 'CONSULTOR'
    const productionDomain = 'https://cotizador.thestoreintelligence.com'
    const targetPath = role === 'ADMIN' ? '/admin/dashboard' : '/quote/new'

    console.log(`[AUTH CALLBACK] Success. Email: ${email}, Role: ${role}, Redirecting to: ${productionDomain}${targetPath}`)

    return NextResponse.redirect(`${productionDomain}${targetPath}`)
}
