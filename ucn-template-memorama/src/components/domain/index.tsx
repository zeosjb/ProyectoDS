"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createDomainItemAction } from "@/actions/domain.actions";
import { calculateScore, pairsForDifficulty, type Difficulty } from "@/lib/domain/rules";
import { getEnvStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { Button, EmptyState, SelectField } from "@/components/ui";

type Theme = {
  id: string;
  name: string;
  description: string;
};

type CardSource = {
  id: string;
  themeId: string;
  pairKey: string;
  label: string;
  imagePath: string | null;
  imageUrl: string | null;
};

type GameCard = {
  id: string;
  pair: string;
  label: string;
  matched: boolean;
  flipped: boolean;
};

type Session = {
  id: string;
  difficulty: Difficulty;
  moves: number;
  durationSeconds: number;
  pairsFound: number;
  score: number;
  createdAt: string;
};

type RankingRow = {
  playerName: string;
  score: number;
  difficulty: Difficulty;
  createdAt: string;
};

const demoThemeId = "00000000-0000-0000-0000-000000000101";
const demoThemes: Theme[] = [
  { id: demoThemeId, name: "Conceptos de software", description: "Pares de ejemplo para practicar." }
];
const demoLabels = ["RLS", "Auth", "UI", "Zod", "SQL", "Build", "Router", "Server", "Client", "Tests"];
const demoCards: CardSource[] = demoLabels.map((label) => ({
  id: "demo-" + label.toLowerCase(),
  themeId: demoThemeId,
  pairKey: label.toLowerCase(),
  label,
  imagePath: null,
  imageUrl: null
}));
const demoSessions: Session[] = [
  { id: "demo-session", difficulty: "easy", moves: 8, durationSeconds: 42, pairsFound: 6, score: calculateScore("easy", 8, 42), createdAt: "2026-08-01" }
];

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function difficultyValue(value: unknown): Difficulty {
  return value === "medium" || value === "hard" ? value : "easy";
}

function shuffle(cards: GameCard[]) {
  return [...cards].sort(() => Math.random() - 0.5);
}

function buildDeck(sources: CardSource[], difficulty: Difficulty) {
  const targetPairs = pairsForDifficulty(difficulty);
  const unique = new Map<string, CardSource>();
  sources.forEach((source) => {
    if (!unique.has(source.pairKey)) unique.set(source.pairKey, source);
  });
  const available = Array.from(unique.values());
  const selected = available.length >= targetPairs ? available.slice(0, targetPairs) : demoCards.slice(0, targetPairs);
  return shuffle(selected.flatMap((source) => [
    { id: source.id + "-a", pair: source.pairKey, label: source.label, matched: false, flipped: false },
    { id: source.id + "-b", pair: source.pairKey, label: source.label, matched: false, flipped: false }
  ]));
}

function useMemoryData() {
  const env = getEnvStatus();
  const [themes, setThemes] = useState<Theme[]>(demoThemes);
  const [cards, setCards] = useState<CardSource[]>(demoCards);
  const [sessions, setSessions] = useState<Session[]>(demoSessions);
  const [ranking, setRanking] = useState<RankingRow[]>([{ playerName: "Jugador demo", score: demoSessions[0].score, difficulty: "easy", createdAt: "2026-08-01" }]);
  const [loading, setLoading] = useState(env.supabaseReady);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!env.supabaseReady) {
      setThemes(demoThemes);
      setCards(demoCards);
      setSessions(demoSessions);
      setRanking([{ playerName: "Jugador demo", score: demoSessions[0].score, difficulty: "easy", createdAt: "2026-08-01" }]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: themeRows, error: themeError } = await supabase
      .from("game_themes")
      .select("id,name,description")
      .eq("is_active", true)
      .order("name");
    const { data: cardRows, error: cardError } = await supabase
      .from("cards")
      .select("id,theme_id,pair_key,label,image_path")
      .order("label");
    const { data: sessionRows, error: sessionError } = await supabase
      .from("game_sessions")
      .select("id,difficulty,moves,duration_seconds,pairs_found,score,created_at")
      .order("created_at", { ascending: false });
    const { data: rankingRows, error: rankingError } = await supabase.rpc("get_game_ranking", {});

    if (themeError || cardError || sessionError || rankingError) {
      setError("No pudimos cargar las partidas. Revisa la sesion, RLS y las migraciones de Supabase.");
      setLoading(false);
      return;
    }

    const nextThemes = (themeRows ?? []).map((row) => ({
      id: text(row.id),
      name: text(row.name, "Tema"),
      description: text(row.description)
    }));
    const nextCards = (cardRows ?? []).map((row) => {
      const imagePath = text(row.image_path) || null;
      const imageUrl = imagePath ? supabase.storage.from("card-images").getPublicUrl(imagePath).data.publicUrl : null;
      return {
        id: text(row.id),
        themeId: text(row.theme_id),
        pairKey: text(row.pair_key),
        label: text(row.label, "Carta"),
        imagePath,
        imageUrl
      };
    });
    const nextSessions = (sessionRows ?? []).map((row) => ({
      id: text(row.id),
      difficulty: difficultyValue(row.difficulty),
      moves: numberValue(row.moves),
      durationSeconds: numberValue(row.duration_seconds),
      pairsFound: numberValue(row.pairs_found),
      score: numberValue(row.score),
      createdAt: text(row.created_at)
    }));
    const nextRanking = (rankingRows ?? []).map((row) => ({
      playerName: row.player_name,
      score: row.score,
      difficulty: row.difficulty,
      createdAt: row.created_at
    }));

    setThemes(nextThemes.length > 0 ? nextThemes : demoThemes);
    setCards(nextCards.length > 0 ? nextCards : demoCards);
    setSessions(nextSessions);
    setRanking(nextRanking);
    setLoading(false);
  }, [env.supabaseReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { themes, cards, sessions, ranking, loading, error, refresh, supabaseReady: env.supabaseReady };
}

export function DomainLanding({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-700">{description}</p>
      <section className="mt-8">
        <MemoryGame />
      </section>
    </main>
  );
}

export function DomainDashboard() {
  const data = useMemoryData();
  return (
    <div className="grid gap-8">
      <MemoryGame data={data} />
      <PlayerHistory data={data} />
      <RankingTable data={data} />
    </div>
  );
}

export function AdminPanel() {
  const data = useMemoryData();
  const activeCards = data.cards.filter((card) => card.themeId === data.themes[0]?.id);
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h1 className="text-3xl font-bold">Administracion de temas</h1>
      <p className="mt-2 text-sm text-slate-700">
        Los temas y cartas se administran desde Supabase con RLS. El bucket card-images permite lectura publica y escritura solo administrativa.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {data.themes.map((theme) => (
          <article key={theme.id} className="rounded-md border border-slate-200 p-3">
            <h2 className="font-semibold">{theme.name}</h2>
            <p className="text-sm text-slate-700">{theme.description || "Sin descripcion."}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-700">Cartas disponibles en el primer tema: {activeCards.length}</p>
    </section>
  );
}

export function MemoryGame({
  title = "Memorama educativo",
  themeId,
  difficulty = "easy",
  boardColor = "#f8fafc",
  cardBackColor = "#6d28d9",
  showTimer = true,
  showMoves = true,
  completionMessage = "Juego completado",
  data
}: {
  title?: string;
  themeId?: string;
  difficulty?: Difficulty;
  boardColor?: string;
  cardBackColor?: string;
  showTimer?: boolean;
  showMoves?: boolean;
  completionMessage?: string;
  data?: ReturnType<typeof useMemoryData>;
}) {
  const fallbackData = useMemoryData();
  const localData = data ?? fallbackData;
  const initialThemeId = themeId && localData.themes.some((theme) => theme.id === themeId) ? themeId : localData.themes[0]?.id ?? demoThemeId;
  const [selectedThemeId, setSelectedThemeId] = useState(initialThemeId);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(difficulty);
  const themeCards = useMemo(
    () => localData.cards.filter((card) => card.themeId === selectedThemeId),
    [localData.cards, selectedThemeId]
  );
  const cardSignature = themeCards.map((card) => card.id).join("|");
  const [cards, setCards] = useState<GameCard[]>(() => buildDeck(themeCards.length > 0 ? themeCards : demoCards, selectedDifficulty));
  const [selected, setSelected] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [resolving, setResolving] = useState(false);
  const [pending, startTransition] = useTransition();
  const targetPairs = pairsForDifficulty(selectedDifficulty);
  const found = cards.filter((card) => card.matched).length / 2;
  const complete = found === targetPairs;

  const reset = useCallback(() => {
    setCards(buildDeck(themeCards.length > 0 ? themeCards : demoCards, selectedDifficulty));
    setSelected([]);
    setMoves(0);
    setSeconds(0);
    setMessage("");
    setResolving(false);
  }, [selectedDifficulty, themeCards]);

  useEffect(() => {
    reset();
  }, [cardSignature, reset]);

  useEffect(() => {
    if (complete) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [complete]);

  const flip = (id: string) => {
    if (selected.length === 2 || resolving || complete) return;
    const card = cards.find((item) => item.id === id);
    if (!card || card.flipped || card.matched) return;
    const nextSelected = [...selected, id];
    setCards((current) => current.map((item) => item.id === id ? { ...item, flipped: true } : item));
    setSelected(nextSelected);
    if (nextSelected.length === 2) {
      setMoves((value) => value + 1);
      setResolving(true);
      const first = cards.find((item) => item.id === nextSelected[0]);
      const second = card;
      window.setTimeout(() => {
        setCards((current) => current.map((item) => {
          if (!nextSelected.includes(item.id)) return item;
          return first?.pair === second.pair ? { ...item, matched: true } : { ...item, flipped: false };
        }));
        setSelected([]);
        setResolving(false);
      }, 550);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-slate-700">{complete ? completionMessage : "Encuentra todos los pares del tema seleccionado."}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ThemeSelector themes={localData.themes} value={selectedThemeId} onChange={setSelectedThemeId} />
          <DifficultySelector difficulty={selectedDifficulty} onChange={setSelectedDifficulty} />
        </div>
      </div>
      {localData.error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{localData.error}</p> : null}
      {localData.loading ? <p className="mt-3 text-sm text-slate-700">Cargando cartas...</p> : null}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {showMoves ? <span>Movimientos: {moves}</span> : null}
        {showTimer ? <span>Tiempo: {seconds}s</span> : null}
        <span>Puntaje estimado: {calculateScore(selectedDifficulty, moves, Math.max(seconds, targetPairs * 2))}</span>
        <Button type="button" variant="secondary" onClick={reset}>Reiniciar</Button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-md p-3 md:grid-cols-4" style={{ backgroundColor: boardColor }}>
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="aspect-square rounded-md text-sm font-bold text-white transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700"
            style={{ backgroundColor: card.flipped || card.matched ? "#0f766e" : cardBackColor }}
            onClick={() => flip(card.id)}
            aria-pressed={card.flipped || card.matched}
          >
            {card.flipped || card.matched ? card.label : "?"}
          </button>
        ))}
      </div>
      {complete ? (
        <GameResult
          themeId={selectedThemeId}
          difficulty={selectedDifficulty}
          moves={moves}
          seconds={Math.max(seconds, targetPairs * 2)}
          pending={pending}
          onSave={(formData) => startTransition(async () => {
            const result = await createDomainItemAction({ ok: false, message: "" }, formData);
            setMessage(result.message);
            if (result.ok) await localData.refresh();
          })}
          message={message}
        />
      ) : null}
    </section>
  );
}

export function ThemeSelector({
  themes = demoThemes,
  value = demoThemeId,
  onChange
}: {
  themes?: Theme[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <SelectField label="Tema" name="themeId" value={value} onChange={(event) => onChange?.(event.target.value)}>
      {themes.map((theme) => (
        <option key={theme.id} value={theme.id}>{theme.name}</option>
      ))}
    </SelectField>
  );
}

export function DifficultySelector({
  difficulty = "easy",
  onChange
}: {
  difficulty?: Difficulty;
  onChange?: (difficulty: Difficulty) => void;
}) {
  return (
    <SelectField label="Dificultad" name="difficulty" value={difficulty} onChange={(event) => onChange?.(difficultyValue(event.target.value))}>
      <option value="easy">Facil</option>
      <option value="medium">Media</option>
      <option value="hard">Dificil</option>
    </SelectField>
  );
}

export function GameResult({
  themeId,
  difficulty,
  moves,
  seconds,
  pending,
  onSave,
  message
}: {
  themeId: string;
  difficulty: Difficulty;
  moves: number;
  seconds: number;
  pending: boolean;
  onSave: (formData: FormData) => void;
  message: string;
}) {
  return (
    <form action={onSave} className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <input type="hidden" name="themeId" value={themeId} />
      <input type="hidden" name="difficulty" value={difficulty} />
      <input type="hidden" name="moves" value={moves} />
      <input type="hidden" name="durationSeconds" value={seconds} />
      <input type="hidden" name="pairsFound" value={pairsForDifficulty(difficulty)} />
      <p className="font-semibold text-emerald-900">Resultado final listo para validar en servidor.</p>
      <Button className="mt-3" disabled={pending} type="submit">{pending ? "Guardando..." : "Guardar resultado"}</Button>
      {message ? <p className="mt-2 text-sm text-emerald-900">{message}</p> : null}
    </form>
  );
}

export function PlayerHistory({ data }: { data?: ReturnType<typeof useMemoryData> }) {
  const fallbackData = useMemoryData();
  const localData = data ?? fallbackData;
  if (localData.sessions.length === 0) {
    return <EmptyState title="Historial personal" description="Tus partidas guardadas apareceran aqui." />;
  }
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Historial personal</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="py-2">Fecha</th>
              <th>Dificultad</th>
              <th>Movimientos</th>
              <th>Tiempo</th>
              <th>Puntaje</th>
            </tr>
          </thead>
          <tbody>
            {localData.sessions.map((session) => (
              <tr key={session.id} className="border-t">
                <td className="py-2">{session.createdAt.slice(0, 10)}</td>
                <td>{difficultyLabel(session.difficulty)}</td>
                <td>{session.moves}</td>
                <td>{session.durationSeconds}s</td>
                <td>{session.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RankingTable({ data }: { data?: ReturnType<typeof useMemoryData> }) {
  const fallbackData = useMemoryData();
  const localData = data ?? fallbackData;
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Ranking</h2>
      {localData.ranking.length === 0 ? (
        <p className="mt-2 text-sm text-slate-700">Aun no hay resultados guardados.</p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {localData.ranking.map((row, index) => (
            <li key={row.playerName + row.createdAt + row.score} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
              <span>{index + 1}. {row.playerName}</span>
              <span className="text-sm text-slate-700">{difficultyLabel(row.difficulty)} · {row.score} puntos</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function difficultyLabel(difficulty: Difficulty) {
  return difficulty === "hard" ? "Dificil" : difficulty === "medium" ? "Media" : "Facil";
}
