import { getGymSettings } from '@/actions/db/gyms'
import { BrandHydrator } from '@/components/brand-hydrator'

export const metadata = { title: 'Member Portal' }

export default async function PortalLayout({ children }) {
  let settings = {}
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const sessionStr = cookieStore.get('gymos_session')?.value
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      settings = await getGymSettings(session.gymCode)
    }
  } catch (e) { }

  return (
    <>
      <BrandHydrator serverBrand={settings} />
      {children}
    </>
  )
}
