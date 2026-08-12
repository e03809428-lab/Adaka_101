import { Link } from "wouter";
import "../game/game.css";

export function HomePage() {
  return (
    <main className="shell">
      <section className="panel">
        <h1>Игра Егора</h1>
        <p>Минималистичный паркур-платформер про wall jump, dash и скорость.</p>
        <Link className="button-link" href="/game">Играть</Link>
        <Link className="button-link secondary-link" href="/profile">Профиль</Link>
      </section>
    </main>
  );
}
