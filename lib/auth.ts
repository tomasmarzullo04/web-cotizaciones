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

    const user = await prisma.user.findUnique({
        where: { email }
    })

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


