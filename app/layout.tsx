import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import { getServerSession } from '@/lib/auth'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mi Cotizador | The Store Intelligence',
  description: 'Sistema de cotización de proyectos de datos',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  return (
    <html lang="es">
      <body className={inter.className}>
        <Navbar userRole={session?.role} userName={session?.name} />
        {children}
        <Toaster richColors position="top-center" theme="dark" />
      </body>
    </html>
  )
}
