import React, { useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

const PRICING_SPA = {
  short: [
    { size: "Mini", weight: "≤5 kg", price: "$240" },
    { size: "Chica", weight: "≤10 kg", price: "$280" },
    { size: "Mediana", weight: "≤15 kg", price: "$340" },
    { size: "Mediana/Grande", weight: "≤20 kg", price: "$420" },
    { size: "Grande", weight: "≤30 kg", price: "$550" },
  ],
  long: [
    { size: "Mini", weight: "≤5 kg", price: "$280" },
    { size: "Chica", weight: "≤10 kg", price: "$300" },
    { size: "Mediana", weight: "≤15 kg", price: "$390" },
    { size: "Mediana/Grande", weight: "≤20 kg", price: "$490" },
    { size: "Grande", weight: "≤30 kg", price: "$690" },
  ],
}

const EXTRAS_LIST = [
  { name: "Aromaterapia (aceites esenciales)", price: "$140" },
  { name: "Mascarilla restauración/nutrición", price: "$180" },
  { name: "Mascarilla hidratación/brillo", price: "$180" },
  { name: "Baño Prevención Bichos (Antipulgas)", price: "$140" },
  { name: "Corte de uñas", price: "$70" },
  { name: "Limpieza de dientes", price: "$100" },
  { name: "Deslanado / Desanudar", price: "Variable" },
  { name: "Grooming (Spa + corte)", price: "Variable" },
  { name: "Pipeta Antipulgas", price: "Variable" },
]

const SERVICES = [
  {
    icon: "🛁",
    title: "Spa Day",
    desc: "Baño profesional, aromaterapia, secado, corte de uñas, limpieza de oídos, bálsamo en patitas, hidratación de nariz, masaje y fragancia de temporada. Productos libres de sulfatos y parabenos.",
    note: "Pelo corto • Pelo largo (lacio, chino, alambre, doble capa) sin nudos",
    pricing: PRICING_SPA,
  },
  {
    icon: "✂️",
    title: "Grooming",
    desc: "Corte y estilismo canino profesional (Spa + corte). Atendemos todas las razas desde Yorkies hasta Golden Retrievers.",
    note: "Precio variable según tamaño y tipo de pelo",
  },
  {
    icon: "🏠",
    title: "Guardería",
    desc: "Tu peludo cuidado mientras trabajas. Plan mensual o eventual con alimentación, paseos y supervisión constante.",
    price: "$3,500 /mes",
    note: "Eventual: $250/día · Lun – Vie · 08:00 am – 06:00 pm",
  },
  {
    icon: "🌙",
    title: "Pensión",
    desc: "Alojamiento nocturno con todas las comodidades. Tu mascota como en casa.",
    price: "$300 /noche",
    note: "Temporada baja · Temporada alta: $380/noche",
  },
  {
    icon: "✨",
    title: "Servicios Extras",
    desc: "Completa la experiencia con tratamientos adicionales para el bienestar de tu peludo.",
    extras: EXTRAS_LIST,
  },
]

const SCHEDULE = [
  { label: "Guardería", days: "Lun – Vie", hours: "08:00 am – 06:00 pm" },
  { label: "Pensión Check-in", days: "Lun – Dom", hours: "11:00 am" },
  { label: "Pensión Check-out", days: "Lun – Dom", hours: "09:00 am" },
  { label: "Spa", days: "Lun – Vie", hours: "09:00 am – 06:30 pm" },
  { label: "Spa", days: "Sáb", hours: "09:00 am – 05:00 pm" },
  { label: "Spa", days: "Dom", hours: "10:00 am – 04:00 pm" },
  { label: "Apertura general", days: "Lun – Dom", hours: "08:00 am – 07:00 pm" },
]

const TEAM = [
  { name: "Harold Salcedo", role: "Fundador · Groomer · Cuidador", emoji: "👨‍💼" },
  { name: "Daniela Padilla", role: "Groomer · Cuidadora", emoji: "👩‍🦰" },
  { name: "Alberto González", role: "Bañador · Cuidador", emoji: "👨‍🦱" },
]

const FAQS: [string, string][] = [
  ["¿Con cuánto tiempo debo agendar una cita?", "Recomendamos agendar con al menos 24 horas de anticipación para garantizar disponibilidad."],
  ["¿Qué incluye el baño profesional?", "Incluye baño con productos premium, secado, cepillado, corte de uñas y limpieza de oídos."],
  ["¿Cómo funciona la guardería?", "Plan mensual de lunes a viernes hábiles de 08:00 am a 06:00 pm. Incluye alimentación, paseos y supervisión constante."],
  ["¿Qué razas atienden en grooming?", "Atendemos todas las razas, desde pequeñas como Yorkies hasta grandes como Golden Retrievers. El precio varía según tamaño y tipo de pelo."],
  ["¿Qué debe traer mi mascota para la pensión?", "Debe traer su comida habitual, medicamentos si requiere, y su cama o manta favorita para que se sienta como en casa."],
  ["¿Tienen promociones o paquetes?", "Sí. Consulta por nuestros paquetes de baños múltiples y descuentos por fidelidad."],
]

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 w-fit rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
      style={{ background: 'rgba(46, 196, 182, 0.25)', border: '1px solid rgba(46, 196, 182, 0.5)', color: '#E6FAF8' }}>
      {children}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{label}</div>
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-[clamp(24px,4vw,38px)] font-extrabold mb-3" style={{ color: '#1F2937' }}>{title}</h2>
      {subtitle && <p className="text-base max-w-[560px] mx-auto" style={{ color: '#6B7280' }}>{subtitle}</p>}
    </div>
  )
}

type Service = {
  icon: string
  title: string
  desc: string
  price?: string
  note?: string
  pricing?: typeof PRICING_SPA
  extras?: typeof EXTRAS_LIST
}

function PricingTable({ data, label }: { data: { size: string; weight: string; price: string }[]; label: string }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: '#6B7280' }}>{label}</div>
      {data.map((row) => (
        <div key={row.size} className="flex justify-between text-xs py-0.5" style={{ color: '#1F2937' }}>
          <span>{row.size} <span className="opacity-60">({row.weight})</span></span>
          <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{row.price}</span>
        </div>
      ))}
    </div>
  )
}

function ServiceCard({ icon, title, desc, price, note, pricing, extras }: Service) {
  return (
    <div className="bg-white rounded-2xl p-7 shadow-sm flex flex-col" style={{ border: '1px solid #E5E7EB' }}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>{title}</h3>
      <p className="text-sm leading-relaxed mb-3 flex-1" style={{ color: '#6B7280' }}>{desc}</p>
      {price && <div className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-primary)' }}>{price}</div>}
      {note && <div className="text-xs mb-3" style={{ color: '#6B7280' }}>{note}</div>}
      {pricing && (
        <div className="mt-auto pt-3" style={{ borderTop: '1px solid #E5E7EB' }}>
          <PricingTable data={pricing.short} label="Pelo corto" />
          <PricingTable data={pricing.long} label="Pelo largo (sin nudos)" />
          <div className="text-xs mt-2 italic" style={{ color: '#6B7280' }}>Libre de sulfatos y parabenos · Cruelty free</div>
        </div>
      )}
      {extras && (
        <div className="mt-auto pt-3" style={{ borderTop: '1px solid #E5E7EB' }}>
          {extras.map((e) => (
            <div key={e.name} className="flex justify-between text-xs py-0.5" style={{ color: '#1F2937' }}>
              <span>{e.name}</span>
              <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{e.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScheduleRow({ label, days, hours, isEven }: { label: string; days: string; hours: string; isEven: boolean }) {
  return (
    <div className={`flex justify-between items-center px-6 py-4 ${isEven ? 'bg-white' : ''}`}
      style={{ borderBottom: '1px solid #E5E7EB', background: isEven ? undefined : 'var(--color-bg)' }}>
      <div>
        <div className="font-semibold text-sm" style={{ color: '#1F2937' }}>{label}</div>
        <div className="text-xs" style={{ color: '#6B7280' }}>{days}</div>
      </div>
      <div className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>{hours}</div>
    </div>
  )
}

function TeamCard({ name, role, emoji }: typeof TEAM[number]) {
  return (
    <div className="bg-white rounded-2xl p-7 text-center shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
        {emoji}
      </div>
      <div className="font-bold text-base mb-1" style={{ color: '#1F2937' }}>{name}</div>
      <div className="text-sm" style={{ color: '#6B7280' }}>{role}</div>
    </div>
  )
}

function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl mb-2 overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
      <button onClick={onToggle}
        className="w-full px-5 py-4 flex justify-between items-center text-left font-semibold text-sm cursor-pointer border-none"
        style={{ background: isOpen ? '#FFF0F4' : '#fff', color: isOpen ? 'var(--color-primary)' : '#1F2937' }}>
        {question}
        <span className="text-lg flex-shrink-0 ml-4" style={{ color: '#6B7280' }}>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: '#1F2937', background: '#FFF0F4' }}>
          {answer}
        </div>
      )}
    </div>
  )
}

function TopBar() {
  return (
    <div className="text-center text-xs py-2 px-4" style={{ background: 'var(--color-primary)', color: '#fff' }}>
      🐾 <strong>Nuevo:</strong> Servicio de pensión nocturna disponible — Reserva ya
      <a href="#servicios" className="ml-3 underline font-semibold" style={{ color: 'var(--color-secondary)' }}>Ver servicios →</a>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="text-center text-white px-6 py-20"
      style={{ background: 'linear-gradient(135deg, #1F2937 0%, #2D1B69 60%, var(--color-primary) 100%)' }}>
      <div className="max-w-[780px] mx-auto">
        <Pill>🐶 Baños · Grooming · Guardería · Pensión · Spa</Pill>
        <h1 className="text-[clamp(30px,5vw,58px)] font-extrabold leading-[1.1] mx-auto mb-5 -tracking-[1.5px] max-w-[780px]">
          El cuidado premium que tu mejor amigo merece
        </h1>
        <p className="text-[17px] max-w-[540px] mx-auto mb-9 leading-relaxed" style={{ color: '#94A3B8' }}>
          Baño profesional, grooming de exhibición, guardería, pensión y spa para perros.
          Amor, experiencia y productos premium en un solo lugar.
        </p>
        <div className="flex gap-3 justify-center flex-wrap mb-14">
          <a className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }} href="#">Agendar cita →</a>
          <a className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', fontSize: 16, padding: '14px 32px' }} href="#servicios">Conocer servicios ↓</a>
        </div>
        <div className="flex gap-12 justify-center flex-wrap pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Stat value="8+" label="Años de experiencia" />
          <Stat value="1500+" label="Peluditos felices" />
          <Stat value="5.0★" label="Calificación" />
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section className="section" style={{ background: 'var(--color-bg)' }}>
      <div className="container max-w-[1000px]">
        <SectionTitle
          title="Servicios para tu peludo"
          subtitle="Deja a tu mejor amigo en manos de expertos con años de experiencia y amor por los animales"
        />
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {SERVICES.map((s, i) => <ServiceCard key={i} {...s} />)}
        </div>
      </div>
    </section>
  )
}

function ScheduleSection() {
  return (
    <section className="section" style={{ background: '#FFF0F4' }}>
      <div className="container max-w-[700px]">
        <SectionTitle title="Horarios" subtitle="Estamos aquí para tu peludo" />
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {SCHEDULE.map((row, i) => (
            <ScheduleRow key={i} {...row} isEven={i % 2 === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TeamSection() {
  return (
    <section className="section" style={{ background: 'var(--color-bg)' }}>
      <div className="container max-w-[700px]">
        <SectionTitle title="Conoce a nuestro equipo" subtitle="Profesionales apasionados por el cuidado canino" />
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {TEAM.map((t, i) => <TeamCard key={i} {...t} />)}
        </div>
      </div>
    </section>
  )
}

function AdminAccessSection() {
  return (
    <section className="section text-center" style={{ background: '#E6FAF8' }}>
      <div className="container max-w-[600px]">
        <div className="text-5xl mb-4">🔐</div>
        <SectionTitle
          title="Acceso administrador"
          subtitle="Harold, gestiona tu negocio desde la plataforma: agenda, clientes, servicios, inventario y más"
        />
        <div className="bg-white rounded-2xl p-8 max-w-[400px] mx-auto shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
          <input type="email" placeholder="Correo electrónico"
            className="w-full px-4 py-3 rounded-lg text-sm mb-3 box-border"
            style={{ border: '1px solid #E5E7EB' }} />
          <input type="password" placeholder="Contraseña"
            className="w-full px-4 py-3 rounded-lg text-sm mb-5 box-border"
            style={{ border: '1px solid #E5E7EB' }} />
          <a className="btn btn-primary" style={{ width: '100%', fontSize: 15, padding: '13px 0' }} href="/login">Ingresar al panel</a>
          <div className="text-xs mt-3" style={{ color: '#6B7280' }}>
            <a href="/login" className="underline" style={{ color: 'var(--color-primary)' }}>¿Olvidaste tu contraseña?</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="section">
      <div className="container max-w-[700px]">
        <SectionTitle title="Preguntas frecuentes" subtitle="Todo lo que necesitas saber antes de visitarnos" />
        {FAQS.map(([q, a], i) => (
          <FAQItem key={i} question={q} answer={a} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
        ))}
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="text-center text-white px-6 py-20"
      style={{ background: 'linear-gradient(135deg, #1F2937 0%, #2D1B69 100%)' }}>
      <h2 className="text-[clamp(24px,4vw,42px)] font-extrabold mb-4">¿Listo para consentir a tu mejor amigo?</h2>
      <p className="text-base max-w-[560px] mx-auto mb-8 leading-relaxed" style={{ color: '#94A3B8' }}>
        Baños · Grooming · Guardería · Pensión · Spa · Servicios extras
      </p>
      <a className="btn" style={{ fontSize: 16, padding: '16px 36px', background: 'var(--color-primary)', color: '#fff' }} href="#">Agendar cita ahora →</a>
      <div className="text-xs mt-4" style={{ color: '#64748B' }}>Lun – Dom · 08:00 am – 07:00 pm · Respuesta en menos de 1 hora</div>
    </section>
  )
}

export default function LandingNueva() {
  return (
    <div className="font-[var(--font-sans)] leading-relaxed">
      <TopBar />
      <Header />
      <HeroSection />
      <ServicesSection />
      <ScheduleSection />
      <TeamSection />
      <AdminAccessSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}
