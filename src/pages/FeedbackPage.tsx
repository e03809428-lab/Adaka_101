import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "wouter";
import { AuthForm } from "../components/AuthForm";
import { sendFeedback } from "../lib/feedback";
import { supabase } from "../lib/supabase";
import "../game/game.css";

type FeedbackStatus = "idle" | "sending" | "success" | "error";

export function FeedbackPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FeedbackStatus>("idle");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsChecking(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorText("");

    try {
      await sendFeedback(message);
      setMessage("");
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorText(error instanceof Error ? error.message : "Не получилось отправить отзыв.");
    }
  }

  if (isChecking) {
    return (
      <main className="shell">
        <section className="panel">
          <p>Проверяем вход...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="shell">
        <section className="panel feedback-panel">
          <Link className="menu-alt-game" href="/game">В меню 1 игры</Link>
          <h1>Отзыв</h1>
          <p>Войди, чтобы оставить отзыв.</p>
        </section>
        <AuthForm />
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel feedback-panel">
        <Link className="menu-alt-game" href="/game">В меню 1 игры</Link>
        <h1>Отзыв</h1>
        <p>Напиши, что понравилось, что сломалось или что стоит добавить.</p>
        <form className="feedback-form" onSubmit={handleSubmit}>
          <textarea
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Мой отзыв..."
            required
            rows={7}
            value={message}
          />
          <span className="feedback-counter">{message.trim().length}/1000</span>
          <button disabled={status === "sending"} type="submit">
            {status === "sending" ? "Отправляем..." : "Отправить"}
          </button>
        </form>
        {status === "success" && <p className="feedback-success">Спасибо! Отзыв сохранён.</p>}
        {status === "error" && <p className="feedback-error">{errorText}</p>}
      </section>
    </main>
  );
}
