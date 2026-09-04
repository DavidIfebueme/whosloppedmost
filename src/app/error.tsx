"use client";

interface ErrorPageProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-void">
      <p className="text-sm text-white/60">the wheel fell off</p>
      <button
        className="rounded-full border border-white/20 px-5 py-2 text-sm hover:border-cheese hover:text-cheese"
        onClick={reset}
        type="button"
      >
        try again
      </button>
    </main>
  );
}
