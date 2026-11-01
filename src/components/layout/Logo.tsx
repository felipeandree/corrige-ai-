import { Link } from 'react-router'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-md" aria-label="CorrigeAÍ, página inicial">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="6" fill="#14213D" />
        <circle cx="16" cy="16" r="8" fill="none" stroke="#F4F5F7" strokeWidth="2.5" />
        <path d="M12 16.5l3 3 6-7" fill="none" stroke="#FFD23F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight">CorrigeAÍ</span>
    </Link>
  )
}
