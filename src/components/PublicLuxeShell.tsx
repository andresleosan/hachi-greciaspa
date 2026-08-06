import type { ReactNode } from 'react'
import AuroraBackground from '../landing/AuroraBackground'
import HeaderGlass from '../landing/HeaderGlass'
import FooterGlass from '../landing/FooterGlass'

export default function PublicLuxeShell({
  children,
  mainClassName = 'sl-page-main',
}: {
  children: ReactNode
  mainClassName?: string
}) {
  return (
    <div className="luxe sl-page-shell">
      <AuroraBackground />
      <HeaderGlass />
      <main className={mainClassName}>{children}</main>
      <FooterGlass />
    </div>
  )
}
