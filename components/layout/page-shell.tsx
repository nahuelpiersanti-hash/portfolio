interface PageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}

export function PageShell({ title, description, children, aside }: PageShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_260px]">
      <main className="min-w-0">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        </header>
        {children}
      </main>
      <aside className="hidden lg:block">{aside}</aside>
    </div>
  );
}
