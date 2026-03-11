import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/systems", label: "Systems" },
  { href: "/systems-map", label: "Systems Map" },
  { href: "/systems-planet", label: "Systems Planet" },
  { href: "/architecture", label: "Architecture" },
  { href: "/notes", label: "Field Notes" },
  { href: "/experiments", label: "Experiments" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function PrimaryNav() {
  return (
    <nav aria-label="Primary navigation">
      <ul className="flex flex-wrap items-center gap-5 text-sm text-slate-600">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link className="transition-colors hover:text-slate-900" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
