import Navbar from './navbar'
import { getSessionRole } from '@/lib/auth'

export async function NavWrapper() {
    const role = await getSessionRole()
    return <Navbar userRole={role} />
}
