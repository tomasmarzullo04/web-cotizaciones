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
            user = {
                id: 'demo-admin',
                name: 'Admin Demo',
                email,
                password: await bcrypt.hash('admin2026', 10),
                role: 'ADMIN',
                createdAt: new Date()
            }
        }
        // Fallback for User
        else if (email === 'tomasmarzullo04@gmail.com' && password === 'user2026') {
            user = {
                id: 'demo-user',
                name: 'Consultor Tomas',
                email,
                password: await bcrypt.hash('user2026', 10),
                role: 'USER',
                createdAt: new Date()
            }
        }
        else if (email === 'maxhigareda@thestoreintelligence.com' && password === 'max2026') {
            user = {
                id: 'demo-max',
                name: 'Max Higareda',
                email,
                password: await bcrypt.hash('max2026', 10),
                role: 'USER',
                createdAt: new Date()
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
    return (await cookies()).get('session_user')?.value || null
}

export async function getSessionUserId() {
    return (await cookies()).get('session_user_id')?.value || null
}


