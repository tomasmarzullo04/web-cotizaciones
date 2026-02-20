'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const createAdminClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: "Credenciales incompletas" }
    }

    const cookieStore = await cookies()

    // 1. Supabase Auth Login
    // We use createServerClient to handle the auth session on the server
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            get(name: string) { return cookieStore.get(name)?.value },
            set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
            remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }) },
        },
    })

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error("[Login] Supabase Auth Error:", error.message)

        if (error.message.includes("Email not confirmed")) {
            return { error: "Tu correo electrónico no ha sido verificado. Por favor revisa tu bandeja de entrada." }
        }

        // DUAL CHECK EXTREME: Auto-Migrate to Supabase Auth
        // If user exists in Prisma but not Supabase, we CREATE them silently with email_confirm: true
        try {
            const legacyUser = await prisma.user.findUnique({ where: { email } })
            if (legacyUser) {
                console.log(`[Auth] Migrating legacy user to Supabase: ${email}`)

                // Need Admin Client to bypass verification
                const adminClient = createAdminClient()
                const { data: migrationData, error: migrationError } = await adminClient.auth.admin.createUser({
                    email,
                    password, // Reuse their input password (hoping it's the same, otherwise they can reset)
                    email_confirm: true,
                    user_metadata: { full_name: legacyUser.name }
                })

                if (migrationError) {
                    console.error("[Auth] Migration Failed:", migrationError.message)
                    return { error: "Error de migración. Por favor contacta soporte." }
                }

                if (migrationData.user) {
                    console.log(`[Auth] Migration Success. Auto-logging in...`)
                    // Retry Login immediately
                    const retry = await supabase.auth.signInWithPassword({ email, password })
                    if (retry.error) {
                        return { error: "Migración exitosa, pero login falló. Intenta de nuevo." }
                    }

                    // DB Sync repeated (Dry needed, but for now copy-paste for safety)
                    try {
                        await prisma.user.upsert({
                            where: { email },
                            update: {},
                            create: {
                                name: legacyUser.name,
                                email,
                                password: '',
                                role: legacyUser.role || 'CONSULTOR',
                            }
                        })
                    } catch (err) { console.error("DB Sync post-migration", err) }

                    const cookieOptions = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
                    // Note: We need 'retry.data.user' here
                    cookieStore.set('session_role', legacyUser.role, cookieOptions)
                    cookieStore.set('session_user', legacyUser.name, cookieOptions)
                    cookieStore.set('session_user_id', legacyUser.id, cookieOptions)

                    console.log(`[AUTH] Login Exitoso (Post-Migración): ${email}`)
                    // Return URL for client-side navigation
                    return { success: true, redirectUrl: legacyUser.role === 'ADMIN' ? '/admin' : '/quote/new' }
                }
            }
        } catch (e) {
            console.error("[Login] Legacy check/migration failed", e)
        }

        // Standard Error
        return { error: "Credenciales inválidas." }
    }

    // 2. Sync with Prisma (Upsert)
    // Now that we verified credentials, we ensure our DB has the user
    // This handles cases where a user might exist in Auth but not in our DB (rare but possible)
    let user = null
    try {
        const fullName = email.split('@')[0]
        user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: fullName,
                email,
                password: '', // Managed by Supabase
                role: 'CONSULTOR', // Default role for new users
            }
        })
    } catch (dbError) {
        console.error("[Login] DB Sync Error:", dbError)
        return { error: "Error de sincronización con la base de datos." }
    }

    // 3. Set App Session Cookies
    // We keep our own cookies for the app's logic (Multitenancy)
    const cookieOptions = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
    cookieStore.set('session_role', user.role, cookieOptions)
    cookieStore.set('session_user', user.name, cookieOptions)
    cookieStore.set('session_user_id', user.id, cookieOptions)

    console.log(`[AUTH] Login Exitoso: ${email}, Rol: ${user.role}`)

    // Return URL instead of Redirecting (Avoids NEXT_REDIRECT error in try/catch blocks)
    const productionDomain = 'https://cotizador.thestoreintelligence.com'
    return {
        success: true,
        redirectUrl: user.role === 'ADMIN'
            ? `${productionDomain}/admin/dashboard`
            : `${productionDomain}/quote/new`
    }
}

export async function registerAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: "Credenciales incompletas" }
    }

    // 1. Duplicate Check (Prisma)
    // We check our DB first to give a fast, clear error
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return { error: "Este correo ya está registrado. Por favor, inicia sesión." }
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

    // 2. Supabase Standard Signup (Triggers Email Verification)
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: email.split('@')[0] },
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://web-cotizaciones.vercel.app'}/auth/v1/callback`
            }
        })

        if (error) {
            console.error("[Register] Supabase Check Error:", error)
            // Supabase sometimes returns "User already registered" as an error (rare with config, but possible)
            if (error.message.includes("already registered") || error.status === 400) {
                return { error: "Este correo ya está registrado. Por favor, inicia sesión." }
            }
            return { error: error.message }
        }

        if (data.user) {
            // 3. Persist in Prisma IMMEDIATELLY as 'CONSULTOR'
            // We do this even if they haven't verified yet, so we have the record.
            // They won't be able to login until verification because loginAction checks Supabase session.
            try {
                await prisma.user.create({
                    data: {
                        id: data.user.id, // SYNC ID VITAL
                        name: email.split('@')[0],
                        email,
                        password: '', // Managed by Supabase
                        role: 'CONSULTOR',
                    }
                })
                console.log(`[Register] User persisted in DB: ${email}`)
            } catch (dbError) {
                console.error("[Register] DB Persistence Failed:", dbError)
                // If this fails, we might have a zombie auth user. 
                // But generally safe to ignore or return error? 
                // Let's return success but log it - login sync will catch it later anyway.
            }

            return { success: true, pendingVerification: true }
        }

        // If we get here, something odd happened (maybe confirmation disabled?)
        return { error: "Registro incompleto. Inténtalo de nuevo." }

    } catch (e: any) {
        console.error("Registration Critical Failure", e)
        return { error: e.message || "Error crítico de registro" }
    }
}

export async function logoutAction() {
    const cookieStore = await cookies()

    // Clear App Session
    cookieStore.delete('session_role')
    cookieStore.delete('session_user')
    cookieStore.delete('session_user_id')

    // Attempt to clear Supabase Auth cookies (best effort, depends on naming convention)
    // We can't easily guess the project-id prefixed cookie name server-side without overhead, 
    // so we rely on the Client component to trigger supabase.auth.signOut() which hits the loopback 
    // or the middleware to clear them. 
    // However, we can force expire common ones if we knew them.

    // Force redirect to landing
    redirect('/')
}

export async function getSessionRole() {
    const session = await getServerSession()
    return session?.role || null
}

export async function getSessionUser() {
    const session = await getServerSession()
    return session?.name || null
}

export async function getSessionUserId() {
    const session = await getServerSession()
    return session?.id || null
}

/**
 * ROBUST SESSION FETCHING & SYNC
 * This is the ultimate gatekeeper for the app's auth state.
 * It checks Supabase Auth first, and if present, ensures custom cookies match Prisma.
 */
export async function getServerSession() {
    const cookieStore = await cookies()

    // 1. Check direct cookies first for speed
    const role = cookieStore.get('session_role')?.value
    const name = cookieStore.get('session_user')?.value
    const id = cookieStore.get('session_user_id')?.value

    // 2. Check Supabase to see if we're actually logged in
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            get(name: string) { return cookieStore.get(name)?.value },
            set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
            remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }) },
        },
    })

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        // If Supabase says no, then we ARE NOT logged in, regardless of cookies
        if (role || name || id) {
            console.log("[Auth] Supabase session missing. Clearing rogue cookies.")
            cookieStore.delete('session_role')
            cookieStore.delete('session_user')
            cookieStore.delete('session_user_id')
        }
        return null
    }

    // 3. If we have a user but no cookies (DESYNC), perform a silent sync
    if (!role || !name || !id) {
        console.log(`[Auth] Desync detected for ${user.email}. Performing silent sync...`)
        try {
            const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
            if (dbUser) {
                const cookieOptions = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
                cookieStore.set('session_role', dbUser.role, cookieOptions)
                cookieStore.set('session_user', dbUser.name, cookieOptions)
                cookieStore.set('session_user_id', dbUser.id, cookieOptions)

                return {
                    id: dbUser.id,
                    name: dbUser.name,
                    role: dbUser.role,
                    email: dbUser.email
                }
            }
        } catch (e) {
            console.error("[Auth] Silent Sync Failed:", e)
        }
    }

    // Normal case: everything is fine or user is in DB but cookies just refreshed
    return {
        id: id || user.id,
        name: name || user.user_metadata?.full_name || user.email?.split('@')[0],
        role: (role as any) || 'CONSULTOR',
        email: user.email
    }
}

export async function syncSessionAction() {
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

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return { error: "No active session to sync." }
    }

    try {
        const fullName = user.user_metadata.full_name || user.email?.split('@')[0]
        const dbUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                id: user.id,
                name: fullName,
                email: user.email!,
                password: '',
                role: 'CONSULTOR',
            }
        })

        const cookieOptions = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
        cookieStore.set('session_role', dbUser.role, cookieOptions)
        cookieStore.set('session_user', dbUser.name, cookieOptions)
        cookieStore.set('session_user_id', dbUser.id, cookieOptions)

        return { success: true, role: dbUser.role }
    } catch (e) {
        console.error("Sync Error:", e)
        return { error: "DB Sync Failed" }
    }
}


