'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: "Credenciales incompletas" }
    }

    let user;


    // DB Access with Fallback
    try {
        console.log(`[Auth] Attempting login for: ${email}`) // DEBUG
        user = await prisma.user.findUnique({
            where: { email }
        })
        console.log(`[Auth] DB Result:`, user ? "User Found" : "User Not Found") // DEBUG
    } catch (e) {
        console.error("DB Login Failed (Fallback to Demo Auth):", e)
    }


    // Demo Fallback / Hardcoded check if DB fails or User not found
    if (!user) {
        // Fallback for Admin
        if (email === 'admin@antigravity.com' && password === 'admin2026') {
            const fallbackAdmin = {
                id: 'demo-admin',
                name: 'Admin Demo',
                email,
                password: await bcrypt.hash('admin2026', 10),
                role: 'ADMIN',
            }
            // Ensure DB record exists
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackAdmin
                })
            } catch (e) {
                console.error("Failed to upsert demo admin", e)
                user = { ...fallbackAdmin, createdAt: new Date() } // temporary memory fallback
            }
        }
        // Fallback for User
        else if (email === 'tomasmarzullo04@gmail.com' && password === 'user2026') {
            const fallbackUser = {
                id: 'demo-user',
                name: 'Tomas Marzullo',
                email,
                password: await bcrypt.hash('user2026', 10),
                role: 'USER',
            }
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackUser
                })
            } catch (e) {
                console.error("Failed to upsert demo user", e)
                user = { ...fallbackUser, createdAt: new Date() }
            }
        }
        else if (email === 'maxhigareda@thestoreintelligence.com' && password === 'max2026') {
            const fallbackMax = {
                id: 'demo-max',
                name: 'Max Higareda',
                email,
                password: await bcrypt.hash('max2026', 10),
                role: 'USER',
            }
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackMax
                })
            } catch (e) {
                console.error("Failed to upsert demo max", e)
                user = { ...fallbackMax, createdAt: new Date() }
            }
        }
        else if (email === 'viridiana@thestoreintelligence.com' && password === 'viridiana2026') {
            const fallbackViridiana = {
                id: 'demo-viridiana',
                name: 'Viridiana',
                email,
                password: await bcrypt.hash('viridiana2026', 10),
                role: 'USER',
            }
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackViridiana
                })
            } catch (e) {
                console.error("Failed to upsert demo viridiana", e)
                user = { ...fallbackViridiana, createdAt: new Date() }
            }
        }
        else if (email === 'darold@thestoreintelligence.com' && password === 'darold2026') {
            const fallbackDarold = {
                id: 'demo-darold',
                name: 'Darold',
                email,
                password: await bcrypt.hash('darold2026', 10),
                role: 'USER',
            }
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackDarold
                })
            } catch (e) {
                console.error("Failed to upsert demo darold", e)
                user = { ...fallbackDarold, createdAt: new Date() }
            }
        }
        else if (email === 'liliana@thestoreintelligence.com' && password === 'liliana2026') {
            const fallbackLiliana = {
                id: 'demo-liliana',
                name: 'Liliana',
                email,
                password: await bcrypt.hash('liliana2026', 10),
                role: 'USER',
            }
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackLiliana
                })
            } catch (e) {
                console.error("Failed to upsert demo liliana", e)
                user = { ...fallbackLiliana, createdAt: new Date() }
            }
        }
        else if (email === 'loudal@thestoreintelligence.com' && password === 'loudal2026') {
            const fallbackLoudal = {
                id: 'demo-loudal',
                name: 'Loudal',
                email,
                password: await bcrypt.hash('loudal2026', 10),
                role: 'USER',
            }
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackLoudal
                })
            } catch (e) {
                console.error("Failed to upsert demo loudal", e)
                user = { ...fallbackLoudal, createdAt: new Date() }
            }
        }
        else if (email === 'ktellez@thestoreintelligence.com' && password === 'ktellez2026') {
            const fallbackKtellez = {
                id: 'demo-ktellez',
                name: 'Ktellez',
                email,
                password: await bcrypt.hash('ktellez2026', 10),
                role: 'USER',
            }
            try {
                user = await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: fallbackKtellez
                })
            } catch (e) {
                console.error("Failed to upsert demo ktellez", e)
                user = { ...fallbackKtellez, createdAt: new Date() }
            }
        }
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return { error: "Credenciales inválidas" }
    }

    // Set Session
    const cookieStore = await cookies()
    cookieStore.set('session_role', user.role, { path: '/', httpOnly: true })
    cookieStore.set('session_user', user.name, { path: '/', httpOnly: true })
    cookieStore.set('session_user_id', user.id, { path: '/', httpOnly: true })

    if (user.role === 'ADMIN') {
        redirect('/admin')
    } else {
        // User goes to new quote immediately
        redirect('/quote/new')
    }
}

export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete('session_role')
    cookieStore.delete('session_user')
    cookieStore.delete('session_user_id')
    redirect('/')
}

export async function getSessionRole() {
    return (await cookies()).get('session_role')?.value || null
}

export async function getSessionUser() {
    const val = (await cookies()).get('session_user')?.value || null
    if (val === 'Consultor Demo' || val === 'Consultor Tomas') return 'Tomas Marzullo'
    return val
}

export async function getSessionUserId() {
    return (await cookies()).get('session_user_id')?.value || null
}


