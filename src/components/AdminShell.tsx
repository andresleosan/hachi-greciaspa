import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BRAND_ASSETS, publicAsset } from '../landing/assets'
import { signOut } from '../services/auth'

type AdminShellProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

type IconName = 'dashboard' | 'calendar' | 'pets' | 'services' | 'team' | 'clients' | 'reports' | 'logout' | 'close'

type NavigationItem = {
  label: string
  href: string
  icon: IconName
}

const baseNavigation: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Citas', href: '/dashboard/agenda', icon: 'calendar' },
  { label: 'Mis mascotas', href: '/dashboard/mascotas', icon: 'pets' },
  { label: 'Servicios', href: '/servicios', icon: 'services' },
]

function isActivePath(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    pets: <><path d="M8.2 11.4c-1.5 0-2.8 1.2-2.8 2.8 0 1.2.8 2 2 2h5.2c1.6 0 2.8-1.1 2.8-2.7 0-1.3-1-2.4-2.3-2.8-.7-.2-1.3-.7-1.7-1.4l-.5-.9c-.5-.9-1.8-.9-2.3 0l-.5.9c-.4.7-1.1 1.3-1.9 1.4Z" /><circle cx="6.5" cy="7" r="1.5" /><circle cx="11" cy="5.5" r="1.5" /><circle cx="15.5" cy="7" r="1.5" /></>,
    services: <><path d="m14.5 5.5 4 4M5 19l3.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 15 5 19Z" /><path d="m13 7 4 4" /></>,
    team: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5" /><path d="M16 5.5a3 3 0 0 1 0 5.8M17 15c2.1.5 3.3 2.1 3.5 5" /></>,
    clients: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5M16 9h5M18.5 6.5v5" /></>,
    reports: <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></>,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" /><path d="m14 8 4 4-4 4M8 12h10" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

export async function logoutAndRedirect(
  signOutFn: () => Promise<unknown>,
  navigateFn: (path: string) => void,
) {
  await signOutFn()
  navigateFn('/login')
}

export default function AdminShell({ title, subtitle, action, children }: AdminShellProps) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    setIsDrawerOpen(false)
  }, [location.pathname])

  const profileName = profile?.displayName || user?.email || 'Perfil'
  const roleLabel = profile?.role === 'admin' ? 'Administrador' : 'Cliente'
  const navigation = profile?.role === 'admin'
    ? [...baseNavigation.slice(0, 2), { label: 'Empleados', href: '/dashboard/empleados', icon: 'team' as const }, ...baseNavigation.slice(2)]
    : baseNavigation

  const handleLogout = () => logoutAndRedirect(signOut, navigate)

  const closeDrawer = () => setIsDrawerOpen(false)

  return (
    <div className="luxe admin-shell">
      {isDrawerOpen && (
        <button className="admin-shell__overlay" type="button" aria-label="Cerrar navegación" onClick={closeDrawer} />
      )}

      <aside id="admin-sidebar" className={`admin-shell__sidebar${isDrawerOpen ? ' is-open' : ''}`}>
        <div className="admin-shell__brand-row">
          <Link className="admin-shell__brand" to="/dashboard" onClick={closeDrawer}>
            <span className="admin-shell__brand-mark">
              <img src={publicAsset(BRAND_ASSETS.logo)} alt="Hachi & Grecia Spa" />
            </span>
            <span className="admin-shell__brand-copy">
              <strong>Hachi &amp; Grecia</strong>
              <small>Spa canino</small>
            </span>
          </Link>
          <button className="admin-shell__drawer-close" type="button" aria-label="Cerrar menú" onClick={closeDrawer}>
            <NavigationIcon name="close" />
          </button>
        </div>

        <nav className="admin-shell__navigation" aria-label="Navegación del panel">
          {navigation.map((item) => {
            const active = isActivePath(location.pathname, item.href)
            return (
              <Link
                className={`admin-shell__nav-link${active ? ' is-active' : ''}`}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={closeDrawer}
                key={item.href}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <span className="admin-shell__nav-link admin-shell__nav-link--disabled" aria-disabled="true">
            <NavigationIcon name="clients" />
            <span>Clientes</span>
            <small>Próximamente</small>
          </span>
          <span className="admin-shell__nav-link admin-shell__nav-link--disabled" aria-disabled="true">
            <NavigationIcon name="reports" />
            <span>Reportes</span>
            <small>Próximamente</small>
          </span>
        </nav>

        <div className="admin-shell__profile">
          <div className="admin-shell__profile-identity">
            <strong>{profileName}</strong>
            <span>{roleLabel}</span>
          </div>
          <button className="admin-shell__logout" type="button" onClick={handleLogout}>
            <NavigationIcon name="logout" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="admin-shell__main">
        <header className="admin-shell__topbar">
          <button
            className="admin-shell__menu-toggle"
            type="button"
            aria-expanded={isDrawerOpen}
            aria-controls="admin-sidebar"
            aria-label={isDrawerOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setIsDrawerOpen((open) => !open)}
          >
            <span className="admin-shell__menu-icon" aria-hidden="true"><span /><span /></span>
            <span>{isDrawerOpen ? 'Cerrar' : 'Menú'}</span>
          </button>
          <div className="admin-shell__context">
            <p className="sl-eyebrow">Área privada</p>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action && <div className="admin-shell__action">{action}</div>}
        </header>
        <div className="admin-shell__content">{children}</div>
      </main>
    </div>
  )
}
