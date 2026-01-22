import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (code) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session?.user?.email) {
            const email = data.session.user.email
            let user = null

            // 1. Check Database First
            try {
                user = await prisma.user.findUnique({
                    where: { email }
                })
            } catch (e) {
                console.error("DB Check Failed in Callback:", e)
            }

            // 2. Open Registration Strategy (Auto-Create)
            if (!user) {
                // Create new user automatically
                try {
                    const newName = data.session.user.user_metadata?.full_name || email.split('@')[0]

                    user = await prisma.user.create({
                        data: {
                            name: newName,
                            email: email,
                            password: '', // No password for OAuth users
                            role: 'USER', // Default role for everyone is 'consultor' (USER)
                        }
                    })
                    console.log(`[Auth] New user created: ${email}`)
                } catch (e) {
                    console.error("[Auth] Failed to auto-create user:", e)
                    // If create fails (e.g. race condition), try to fetch again
                    try {
                        user = await prisma.user.findUnique({ where: { email } })
                    } catch (inner) {
                        console.error("[Auth] Recovery fetch failed:", inner)
                    }
                }
            }

            if (user) {
                // Authorized! Set App Cookies
                const cookieStore = await cookies()

                // Helper to set cookie options
                // Note: HttpOnly is important for security.
                const cookieOptions = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' }

                cookieStore.set('session_role', user.role, cookieOptions)
                // Use a proper name field if available, otherwise email
                cookieStore.set('session_user', user.name || user.email, cookieOptions)
                cookieStore.set('session_user_id', user.id, cookieOptions)

                // Redirect to Dashboard
                return NextResponse.redirect(`${origin}/dashboard`)
            }
        }
    }

    // Error (Invalid Code) or Creation Failed
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Error al crear cuenta o iniciar sesión.")}`)
}
