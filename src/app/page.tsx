export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-void px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        who slopped the most
      </p>
      <h1 className="max-w-xl text-4xl font-bold leading-tight">
        the race is loading, the progress is not
      </h1>
      <p className="max-w-md text-sm text-white/60">
        3d spiral plus live github scoring is on the way. first unit is the
        scaffold plus health check.
      </p>
      <a
        className="rounded-full border border-white/20 px-5 py-2 text-sm hover:border-cheese hover:text-cheese"
        href="/api/health"
      >
        check health
      </a>
    </main>
  );
}
