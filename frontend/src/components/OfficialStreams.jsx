export default function OfficialStreams({ streams = [] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-card p-6">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-accentBlue">
          Transmisiones oficiales
        </p>
        <h2 className="text-lg font-semibold">Ver en plataformas legales y gratis</h2>
        <p className="mt-1 text-sm text-white/60">
          Enlaces directos a señales abiertas y plataformas oficiales del Mundial.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {streams.map((stream) => (
          <a
            key={stream.id}
            href={stream.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-white/10 bg-carbon p-4 transition hover:border-white/25 hover:bg-white/5"
            style={{ boxShadow: `inset 3px 0 0 0 ${stream.color}` }}
          >
            <p className="font-semibold group-hover:text-accent">{stream.name}</p>
            <p className="mt-1 text-sm text-white/60">{stream.description}</p>
            <span className="mt-3 inline-flex text-xs font-medium text-accentBlue">
              Abrir plataforma →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
