import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-mono font-semibold">v1</span>
            <span className="text-slate-500 text-xs">REST API</span>
          </div>
          <h1 className="text-3xl font-black">Football AI API</h1>
          <p className="text-slate-400 mt-2 text-base max-w-2xl">
            Programmatic access to match analyses, player stats, and AI insights.
            Available on Pro and Team plans.{" "}
            <Link href="/settings/api-keys" className="text-emerald-400 hover:underline">Get your API key →</Link>
          </p>
        </div>

        <Section title="Authentication">
          <p className="text-slate-400 text-sm mb-3">
            All API requests require a Bearer token. Generate a key in{" "}
            <Link href="/settings/api-keys" className="text-emerald-400 hover:underline">Settings → API Keys</Link>.
          </p>
          <CodeBlock>{`curl https://your-domain.com/api/v1/match/1/analysis \\
  -H "Authorization: Bearer faa_your_api_key"`}</CodeBlock>
        </Section>

        <Section title="Rate Limits">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-6">Plan</th>
                <th className="text-left py-2 pr-6">Daily Limit</th>
                <th className="text-left py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { plan: "Free", limit: "—", note: "No API access" },
                { plan: "Pro", limit: "100 req/day", note: "Per API key" },
                { plan: "Team", limit: "1,000 req/day", note: "Per API key" },
              ].map((r) => (
                <tr key={r.plan} className="text-slate-300">
                  <td className="py-2.5 pr-6 font-medium">{r.plan}</td>
                  <td className="py-2.5 pr-6 font-mono text-xs text-emerald-400">{r.limit}</td>
                  <td className="py-2.5 text-slate-500 text-xs">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-3">Rate-limited requests return <code className="text-red-400">401</code>. Resets at midnight UTC.</p>
        </Section>

        <Section title="Endpoints">
          <div className="space-y-8">

            <Endpoint
              method="GET"
              path="/api/v1/match/{id}/analysis"
              description="Returns full match data: score, team stats, AI insights, and top player ratings."
              params={[{ name: "id", type: "integer", desc: "Match ID" }]}
              example={`curl /api/v1/match/1/analysis \\
  -H "Authorization: Bearer faa_..."

{
  "object": "match_analysis",
  "id": 1,
  "match": {
    "home_team": "Manchester City",
    "away_team": "Arsenal",
    "score": { "home": 3, "away": 1 },
    "status": "finished",
    "date": "2026-05-01",
    "league": "Premier League"
  },
  "stats": [...],
  "analysis": {
    "insights": ["City dominated with 68% possession...", ...],
    "model": "claude-sonnet-4-6",
    "generated_at": "2026-05-01T22:15:00Z"
  },
  "top_players": [...]
}`}
            />

            <Endpoint
              method="GET"
              path="/api/v1/player/{id}/stats"
              description="Returns a player's season stats, recent match history, and FPL score estimate."
              params={[{ name: "id", type: "integer", desc: "Player ID" }]}
              example={`curl /api/v1/player/1/stats \\
  -H "Authorization: Bearer faa_..."

{
  "object": "player_stats",
  "id": 1,
  "player": {
    "name": "Erling Haaland",
    "position": "FW",
    "age": 24,
    "team": "Manchester City"
  },
  "season_stats": {
    "matches_played": 28,
    "avg_rating": 8.4,
    "goals": 24,
    "assists": 6,
    "avg_pass_accuracy": 82.1
  },
  "fantasy": {
    "fpl_score_estimate": 198,
    "fpl_rating_scale": 84
  },
  "recent_matches": [...]
}`}
            />

          </div>
        </Section>

        <Section title="Embeddable Widget">
          <p className="text-slate-400 text-sm mb-3">
            Embed a live match card anywhere with a single iframe. Free plan includes &quot;Powered by Football AI&quot; branding.
            Pro/Team can remove it with <code className="text-emerald-400 text-xs">?whitelabel=1</code>.
          </p>
          <CodeBlock>{`<!-- Drop this anywhere on your site -->
<iframe
  src="https://your-domain.com/widget/match/1"
  width="400"
  height="160"
  frameborder="0"
  style="border-radius:12px;overflow:hidden"
></iframe>

<!-- Pro/Team: remove branding -->
<iframe src="https://your-domain.com/widget/match/1?whitelabel=1" ... />`}</CodeBlock>
        </Section>

        <Section title="Webhooks">
          <p className="text-slate-400 text-sm mb-3">
            Receive real-time POST payloads when analyses complete, matches go live, or reports are generated.
            Available on Team plan. Configure in{" "}
            <Link href="/settings/webhooks" className="text-emerald-400 hover:underline">Settings → Webhooks</Link>.
          </p>
          <p className="text-xs text-slate-500 mb-3">Events: <code className="text-emerald-400">match.analysis.completed</code> · <code className="text-emerald-400">match.live.event</code> · <code className="text-emerald-400">pre_match.report.generated</code></p>
          <CodeBlock>{`// POST to your webhook URL
{
  "event": "match.analysis.completed",
  "timestamp": "2026-05-01T22:15:00Z",
  "data": {
    "match_id": 1,
    "home_team": "Manchester City",
    "away_team": "Arsenal",
    "insights": ["...", "..."]
  }
}`}</CodeBlock>
          <p className="text-xs text-slate-500 mt-3">
            Each request includes an <code className="text-emerald-400">X-FA-Signature</code> HMAC-SHA256 header for verification.
          </p>
        </Section>

        <Section title="Errors">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-6">Status</th>
                <th className="text-left py-2">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { code: "401", msg: "Missing or invalid API key / rate limit exceeded" },
                { code: "403", msg: "Feature not available on your plan" },
                { code: "404", msg: "Resource not found" },
                { code: "400", msg: "Invalid request parameters" },
                { code: "500", msg: "Server error — retry with exponential back-off" },
              ].map((e) => (
                <tr key={e.code} className="text-slate-300">
                  <td className="py-2.5 pr-6 font-mono text-xs text-red-400">{e.code}</td>
                  <td className="py-2.5 text-slate-400 text-xs">{e.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="text-center pt-4">
          <Link href="/settings/api-keys"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition">
            Get your API key
          </Link>
        </div>

      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black mb-4 border-b border-white/10 pb-3">{title}</h2>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed font-mono">
      {children}
    </pre>
  );
}

function Endpoint({ method, path, description, params, example }: {
  method: string; path: string; description: string;
  params: { name: string; type: string; desc: string }[];
  example: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-md">{method}</span>
        <code className="text-white font-mono text-sm">{path}</code>
      </div>
      <p className="text-slate-400 text-sm">{description}</p>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Parameters</p>
        <table className="text-xs border-collapse">
          <tbody>
            {params.map((p) => (
              <tr key={p.name}>
                <td className="pr-4 py-1 font-mono text-emerald-400">{p.name}</td>
                <td className="pr-4 py-1 text-slate-500">{p.type}</td>
                <td className="py-1 text-slate-400">{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CodeBlock>{example}</CodeBlock>
    </div>
  );
}
