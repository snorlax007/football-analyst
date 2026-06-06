"use client";

import { useState } from "react";

const ALL_INSIGHTS = [
  "City exploited Arsenal's left flank repeatedly, generating 43% of attacks from that channel.",
  "Arsenal's defensive line became increasingly stretched after the 60th minute.",
  "Haaland occupied both center backs effectively, creating space for midfield runners.",
  "Rodri controlled transition phases and completed 96% of progressive passes.",
  "City's counter-press recovered possession within 8 seconds on average.",
  "Arsenal's build-up efficiency dropped significantly under aggressive pressing.",
  "Expected threat metrics show City's right wing generated the most dangerous attacks.",
  "Substitution patterns improved City's defensive stability in the final 20 minutes.",
  "Arsenal conceded multiple overload situations near the half-spaces.",
  "City maintained tactical compactness and prevented central penetration.",
];

const DEFAULT_INSIGHTS = [
  "Manchester City dominated midfield progression through central overloads and quick one-touch combinations.",
  "Arsenal struggled against City's high press, losing possession 18 times in their defensive third.",
  "City's xG of 2.7 indicates the scoreline accurately reflects the quality of chances created.",
];

function pickRandom(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function Home() {
  const [insights, setInsights] = useState<string[]>(DEFAULT_INSIGHTS);
  const [loading, setLoading] = useState(false);

  function runAnalysis() {
    setLoading(true);
    setTimeout(() => {
      setInsights(pickRandom(ALL_INSIGHTS, 4));
      setLoading(false);
    }, 1500);
  }

  return (
    <>
      <header>
        <h1>⚽ Football AI Match Analyst</h1>
        <p>Automated Tactical Intelligence &amp; Performance Analysis</p>
      </header>

      <div className="container">
        <div className="match-card">
          <div className="team">
            <h2>Manchester City</h2>
          </div>
          <div className="score">
            <h1>3 - 1</h1>
            <p>Full Time</p>
          </div>
          <div className="team">
            <h2>Arsenal</h2>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <h3>📊 Team Statistics</h3>
            {[
              { label: "Possession 65%", width: "65%" },
              { label: "Pass Accuracy 91%", width: "91%" },
              { label: "Expected Goals (xG) 2.7", width: "87%" },
              { label: "Pressing Efficiency 82%", width: "82%" },
            ].map(({ label, width }) => (
              <div className="stat" key={label}>
                {label}
                <div className="bar">
                  <div className="fill" style={{ width }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>⭐ Top Player Ratings</h3>
            <div className="players">
              {[
                { name: "Kevin De Bruyne", rating: "9.4" },
                { name: "Erling Haaland", rating: "9.1" },
                { name: "Rodri", rating: "8.8" },
                { name: "Bernardo Silva", rating: "8.5" },
              ].map(({ name, rating }) => (
                <div className="player" key={name}>
                  <span>{name}</span>
                  <span className="rating">{rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card analysis">
          <h3>🤖 AI Tactical Analysis</h3>

          {loading ? (
            <div className="insight loading">
              AI Agent analyzing 4,382 match events...
            </div>
          ) : (
            insights.map((text, i) => (
              <div className="insight" key={i}>
                {text}
              </div>
            ))
          )}

          <button onClick={runAnalysis}>Generate New AI Analysis</button>
        </div>
      </div>
    </>
  );
}
