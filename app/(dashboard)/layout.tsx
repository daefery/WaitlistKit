import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Belt-and-suspenders: server-side auth check behind the middleware gate (AUTH-2 enabler)
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <div data-testid="dashboard-shell">{children}</div>
}
