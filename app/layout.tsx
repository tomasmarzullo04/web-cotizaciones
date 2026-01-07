import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import { getSessionRole, getSessionUser } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cotizador B2B',
  description: 'Sistema de cotización de proyectos de datos',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getSessionRole()
  const name = await getSessionUser()

  return (
    <html lang="es">
      <body className={inter.className}>
        <Navbar userRole={role} userName={name} />
        {children}
      </body>
    </html>
  )
}
