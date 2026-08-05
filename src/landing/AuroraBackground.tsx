/** Fondo vivo — aurora sutil con luz difusa. Solo decorativo, sin JS. */

export default function AuroraBackground() {
  return (
    <div className="sl-aurora" aria-hidden="true">
      <div className="sl-aurora-blob sl-aurora-blob--a" />
      <div className="sl-aurora-blob sl-aurora-blob--b" />
      <div className="sl-aurora-blob sl-aurora-blob--c" />
      <div className="sl-aurora-sheen" />
    </div>
  )
}
