"use client";

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBoardAction, createDomainItemAction } from "@/actions/domain.actions";
import { calculateScore, pairsForDifficulty, type Difficulty } from "@/lib/domain/rules";
import { getEnvStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { Button, EmptyState, Field, SelectField, TextareaField } from "@/components/ui";

type Theme = {
  id: string;
  name: string;
  description: string;
  ownerId: string | null;
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
  themeId: string;
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
  { id: demoThemeId, name: "Conceptos de software", description: "Pares de ejemplo para practicar.", ownerId: null }
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
  { id: "demo-session", themeId: demoThemeId, difficulty: "easy", moves: 8, durationSeconds: 42, pairsFound: 6, score: calculateScore("easy", 8, 42), createdAt: "2026-08-01" }
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

function isMissingSchemaError(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && "code" in error
    && (error.code === "PGRST205" || error.code === "PGRST202")
  );
}

function shuffle(cards: GameCard[]) {
  return [...cards].sort(() => Math.random() - 0.5);
}

function uniquePairs(sources: CardSource[]) {
  const unique = new Map<string, CardSource>();
  sources.forEach((source) => {
    if (!unique.has(source.pairKey)) unique.set(source.pairKey, source);
  });
  return Array.from(unique.values());
}

function buildDeck(sources: CardSource[], difficulty: Difficulty) {
  const targetPairs = pairsForDifficulty(difficulty);
  const available = uniquePairs(sources);
  if (available.length < targetPairs) return [];
  const selected = available.slice(0, targetPairs);
  return shuffle(selected.flatMap((source) => [
    { id: source.id + "-a", pair: source.pairKey, label: source.label, matched: false, flipped: false },
    { id: source.id + "-b", pair: source.pairKey, label: source.label, matched: false, flipped: false }
  ]));
}

function useMemoryData(enabled = true) {
  const env = getEnvStatus();
  const useDemoData = !enabled || !env.supabaseReady;
  const [themes, setThemes] = useState<Theme[]>(useDemoData ? demoThemes : []);
  const [cards, setCards] = useState<CardSource[]>(useDemoData ? demoCards : []);
  const [sessions, setSessions] = useState<Session[]>(useDemoData ? demoSessions : []);
  const [ranking, setRanking] = useState<RankingRow[]>(useDemoData ? [{ playerName: "Jugador demo", score: demoSessions[0].score, difficulty: "easy", createdAt: "2026-08-01" }] : []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(env.supabaseReady && enabled);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled || !env.supabaseReady) {
      setThemes(demoThemes);
      setCards(demoCards);
      setSessions(demoSessions);
      setRanking([{ playerName: "Jugador demo", score: demoSessions[0].score, difficulty: "easy", createdAt: "2026-08-01" }]);
      setUserId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    setUserId(userData.user?.id ?? null);

    const { data: themeRows, error: themeError } = await supabase
      .from("game_themes")
      .select("id,name,description,owner_id")
      .eq("is_active", true)
      .order("name");
    const { data: cardRows, error: cardError } = await supabase
      .from("cards")
      .select("id,theme_id,pair_key,label,image_path")
      .order("label");
    const { data: sessionRows, error: sessionError } = await supabase
      .from("game_sessions")
      .select("id,theme_id,difficulty,moves,duration_seconds,pairs_found,score,created_at")
      .order("created_at", { ascending: false });
    const { data: rankingRows, error: rankingError } = await supabase.rpc("get_game_ranking");

    if (themeError || cardError || sessionError || rankingError) {
      if ([themeError, cardError, sessionError, rankingError].some(isMissingSchemaError)) {
        setThemes([]);
        setCards([]);
        setSessions([]);
        setRanking([]);
        setError("Faltan las migraciones de memorama en Supabase.");
        setLoading(false);
        return;
      }

      setError("No pudimos cargar las partidas. Revisa que este proyecto Supabase tenga aplicadas las migraciones de memorama.");
      setLoading(false);
      return;
    }

    const nextThemes = (themeRows ?? []).map((row) => ({
      id: text(row.id),
      name: text(row.name, "Tema"),
      description: text(row.description),
      ownerId: text(row.owner_id) || null
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
      themeId: text(row.theme_id),
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

    setThemes(nextThemes);
    setCards(nextCards);
    setSessions(nextSessions);
    setRanking(nextRanking);
    setLoading(false);
  }, [enabled, env.supabaseReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { themes, cards, sessions, ranking, userId, loading, error, refresh, supabaseReady: env.supabaseReady };
}

export function DomainLanding({ title, description, requireLogin = false }: { title: string; description: string; requireLogin?: boolean }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-700">{description}</p>
      <section className="mt-8">
        <MemoryGame requireLogin={requireLogin} />
      </section>
    </main>
  );
}

export function DomainDashboard() {
  const data = useMemoryData();
  const [creatingBoard, setCreatingBoard] = useState(false);

  return (
    <div className="grid gap-8">
      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Memoramas</h1>
          <p className="mt-1 text-sm text-slate-700">Juega, crea tableros y revisa tus resultados guardados.</p>
        </div>
        <Button type="button" onClick={() => setCreatingBoard(true)}>Crear tablero</Button>
      </section>
      {creatingBoard ? (
        <BoardCreationModal
          onClose={() => setCreatingBoard(false)}
          onCreated={data.refresh}
        />
      ) : null}
      <MemoryGame data={data} />
      <MyBoards data={data} />
      <PlayerHistory data={data} />
      <RankingTable data={data} />
    </div>
  );
}

function BoardCreationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(createBoardAction, { ok: false, message: "" });

  useEffect(() => {
    if (!state.ok) return;

    void onCreated();
    const timer = window.setTimeout(onClose, 700);
    return () => window.clearTimeout(timer);
  }, [state.ok, onClose, onCreated]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 px-4 py-6">
      <div className="w-full max-w-2xl rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Crear tablero</h2>
            <p className="mt-1 text-sm text-slate-700">Cada carta escrita se duplica automaticamente como par del memorama.</p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
        <form action={formAction} className="mt-5 grid gap-4">
          <Field label="Nombre" name="name" placeholder="Conceptos de redes" required minLength={3} maxLength={80} />
          <TextareaField
            label="Descripcion"
            name="description"
            placeholder="Practica de terminos para la clase"
            maxLength={240}
          />
          <TextareaField
            label="Cartas"
            name="cards"
            placeholder={"DNS\nIP\nRouter\nSwitch\nFirewall\nServidor\nCliente\nPuerto\nDominio\nCache"}
            required
          />
          {state.message ? (
            <p className={"rounded-md border px-3 py-2 text-sm " + (state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800")}>
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creando..." : "Guardar tablero"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MyBoards({ data }: { data: ReturnType<typeof useMemoryData> }) {
  const boards = useMemo(
    () => data.themes.filter((theme) => theme.ownerId && theme.ownerId === data.userId),
    [data.themes, data.userId]
  );

  if (data.loading) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold">Mis tableros</h2>
        <p className="mt-2 text-sm text-slate-700">Cargando estadisticas...</p>
      </section>
    );
  }

  if (boards.length === 0) {
    return (
      <section className="rounded-md border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Mis tableros</h2>
        <p className="mt-2 text-sm text-slate-700">Todavia no tienes tableros propios.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Mis tableros</h2>
      <p className="mt-1 text-sm text-slate-700">Estadisticas de tus tableros creados.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {boards.map((board) => {
          const boardCards = data.cards.filter((card) => card.themeId === board.id);
          const boardSessions = data.sessions.filter((session) => session.themeId === board.id);
          const bestScore = boardSessions.length > 0 ? Math.max(...boardSessions.map((session) => session.score)) : 0;
          const averageMoves = average(boardSessions.map((session) => session.moves));
          const averageSeconds = average(boardSessions.map((session) => session.durationSeconds));
          const lastPlayedAt = boardSessions[0]?.createdAt;

          return (
            <article key={board.id} className="rounded-md border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-950">{board.name}</h3>
              <p className="mt-1 text-sm text-slate-700">{board.description || "Sin descripcion."}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Cartas</dt>
                  <dd className="font-semibold text-slate-950">{boardCards.length}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Partidas</dt>
                  <dd className="font-semibold text-slate-950">{boardSessions.length}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Mejor puntaje</dt>
                  <dd className="font-semibold text-slate-950">{bestScore}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Promedio</dt>
                  <dd className="font-semibold text-slate-950">{averageMoves} mov. / {averageSeconds}s</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                {lastPlayedAt ? `Ultima partida: ${lastPlayedAt.slice(0, 10)}` : "Aun no tiene partidas guardadas."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
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
  requireLogin = false,
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
  requireLogin?: boolean;
  data?: ReturnType<typeof useMemoryData>;
}) {
  const router = useRouter();
  const fallbackData = useMemoryData(!data && !requireLogin);
  const localData = data ?? fallbackData;
  const initialThemeId = themeId && localData.themes.some((theme) => theme.id === themeId) ? themeId : localData.themes[0]?.id ?? "";
  const [selectedThemeId, setSelectedThemeId] = useState(initialThemeId);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(difficulty);
  const selectedTheme = useMemo(
    () => localData.themes.find((theme) => theme.id === selectedThemeId) ?? null,
    [localData.themes, selectedThemeId]
  );
  const themeCards = useMemo(
    () => localData.cards.filter((card) => card.themeId === selectedThemeId),
    [localData.cards, selectedThemeId]
  );
  const availablePairs = useMemo(() => uniquePairs(themeCards).length, [themeCards]);
  const cardSignature = themeCards.map((card) => card.id).join("|");
  const [cards, setCards] = useState<GameCard[]>(() => buildDeck(themeCards, selectedDifficulty));
  const [selected, setSelected] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [resolving, setResolving] = useState(false);
  const [started, setStarted] = useState(false);
  const [themeSearch, setThemeSearch] = useState("");
  const [themePage, setThemePage] = useState(1);
  const [pending, startTransition] = useTransition();
  const targetPairs = pairsForDifficulty(selectedDifficulty);
  const found = cards.filter((card) => card.matched).length / 2;
  const complete = cards.length > 0 && found === targetPairs;
  const hasThemes = localData.themes.length > 0;
  const canPlay = !requireLogin && !localData.loading && Boolean(selectedTheme) && availablePairs >= targetPairs;
  const gameStatus = !hasThemes
    ? "Todavia no hay memoramas disponibles para jugar."
    : !selectedTheme
      ? "Selecciona un memorama disponible."
      : availablePairs < targetPairs
        ? `Este memorama tiene ${availablePairs} pares. Para dificultad ${difficultyLabel(selectedDifficulty)} necesita ${targetPairs}.`
        : "Elige un tema y presiona Jugar para comenzar.";
  const goToLogin = () => {
    if (requireLogin) router.push("/login");
  };

  const reset = useCallback(() => {
    setCards(buildDeck(themeCards, selectedDifficulty));
    setSelected([]);
    setMoves(0);
    setSeconds(0);
    setMessage("");
    setResolving(false);
    setStarted(false);
  }, [selectedDifficulty, themeCards]);

  useEffect(() => {
    reset();
  }, [cardSignature, reset]);

  useEffect(() => {
    setThemePage(1);
  }, [themeSearch]);

  useEffect(() => {
    if (localData.loading) return;
    if (themeId && localData.themes.some((theme) => theme.id === themeId)) {
      setSelectedThemeId(themeId);
      return;
    }
    if (!localData.themes.some((theme) => theme.id === selectedThemeId)) {
      setSelectedThemeId(localData.themes[0]?.id ?? "");
    }
  }, [localData.loading, localData.themes, selectedThemeId, themeId]);

  useEffect(() => {
    if (!started || complete) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [complete, started]);

  const startGame = () => {
    if (requireLogin) {
      goToLogin();
      return;
    }
    if (!canPlay) return;

    setCards(buildDeck(themeCards, selectedDifficulty));
    setSelected([]);
    setMoves(0);
    setSeconds(0);
    setMessage("");
    setResolving(false);
    setStarted(true);
  };

  const flip = (id: string) => {
    if (requireLogin) {
      goToLogin();
      return;
    }
    if (!started || selected.length === 2 || resolving || complete) return;
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
    <section className="relative rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-slate-700">
            {requireLogin ? "Inicia sesion para jugar y guardar tus resultados." : complete ? completionMessage : started ? "Encuentra todos los pares del tema seleccionado." : gameStatus}
          </p>
          {selectedTheme ? (
            <p className="mt-1 text-xs text-slate-500">
              {selectedTheme.description || "Sin descripcion."} Cartas disponibles: {themeCards.length}.
            </p>
          ) : null}
        </div>
        <div className="grid gap-3">
          <DifficultySelector difficulty={selectedDifficulty} onChange={setSelectedDifficulty} disabled={requireLogin} />
        </div>
      </div>
      {localData.error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{localData.error}</p> : null}
      {localData.loading ? <p className="mt-3 text-sm text-slate-700">Cargando cartas...</p> : null}
      <ThemeBrowser
        themes={localData.themes}
        cards={localData.cards}
        value={selectedThemeId}
        search={themeSearch}
        page={themePage}
        disabled={requireLogin || localData.loading || !hasThemes}
        onSearchChange={setThemeSearch}
        onPageChange={setThemePage}
        onChange={setSelectedThemeId}
      />
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {showMoves ? <span>Movimientos: {moves}</span> : null}
        {showTimer ? <span>Tiempo: {seconds}s</span> : null}
        <span>Puntaje estimado: {calculateScore(selectedDifficulty, moves, Math.max(seconds, targetPairs * 2))}</span>
        {started ? (
          <Button type="button" variant="secondary" disabled={requireLogin} onClick={reset}>Reiniciar</Button>
        ) : (
          <Button type="button" disabled={!canPlay} onClick={startGame}>Jugar</Button>
        )}
      </div>
      {started ? (
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-md p-3 md:grid-cols-4" style={{ backgroundColor: boardColor }}>
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="aspect-square rounded-md text-sm font-bold text-white transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700"
              style={{ backgroundColor: card.flipped || card.matched ? "#0f766e" : cardBackColor }}
              onClick={() => flip(card.id)}
              disabled={requireLogin}
              aria-pressed={card.flipped || card.matched}
            >
              {card.flipped || card.matched ? card.label : "?"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid min-h-64 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-700">{canPlay ? "El tablero aparecera cuando inicies la partida." : gameStatus}</p>
        </div>
      )}
      {complete ? (
        <GameResult
          themeId={selectedThemeId}
          difficulty={selectedDifficulty}
          moves={moves}
          seconds={seconds}
          pending={pending}
          onSave={(formData) => startTransition(async () => {
            const result = await createDomainItemAction({ ok: false, message: "" }, formData);
            setMessage(result.message);
            if (result.ok) await localData.refresh();
          })}
          message={message}
        />
      ) : null}
      {requireLogin ? (
        <button
          type="button"
          className="absolute inset-0 z-10 grid cursor-pointer place-items-center rounded-md bg-slate-950/10 p-4 text-left backdrop-blur-[1px]"
          onClick={goToLogin}
          aria-label="Iniciar sesion para jugar"
        >
          <span className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg">
            Inicia sesion para jugar
          </span>
        </button>
      ) : null}
    </section>
  );
}

function ThemeBrowser({
  themes,
  cards,
  value,
  search,
  page,
  disabled,
  onSearchChange,
  onPageChange,
  onChange
}: {
  themes: Theme[];
  cards: CardSource[];
  value: string;
  search: string;
  page: number;
  disabled: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onChange: (value: string) => void;
}) {
  const pageSize = 5;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredThemes = themes.filter((theme) => theme.name.toLowerCase().includes(normalizedSearch));
  const pageCount = Math.max(1, Math.ceil(filteredThemes.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleThemes = filteredThemes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const canGoBack = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  return (
    <section className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Jugar memorama</h3>
          <p className="text-sm text-slate-700">Selecciona un memorama para cargar sus cartas.</p>
        </div>
        <Field
          label="Buscar por nombre"
          name="themeSearch"
          type="search"
          value={search}
          placeholder="Ej: capitulos"
          disabled={disabled && themes.length === 0}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:w-72"
        />
      </div>
      {themes.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">
          Todavia no hay memoramas disponibles.
        </p>
      ) : visibleThemes.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">
          No encontramos memoramas con ese nombre.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {visibleThemes.map((theme) => {
            const themeCards = cards.filter((card) => card.themeId === theme.id);
            const pairCount = uniquePairs(themeCards).length;
            const selected = theme.id === value;

            return (
              <button
                key={theme.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(theme.id)}
                className={
                  "w-full rounded-md border bg-white p-3 text-left transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 "
                  + (selected ? "border-emerald-700 ring-1 ring-emerald-700" : "border-slate-200 hover:border-emerald-300")
                }
                aria-pressed={selected}
              >
                <span className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <span>
                    <span className="block font-semibold text-slate-950">{theme.name}</span>
                    <span className="mt-1 block text-sm text-slate-700">{theme.description || "Sin descripcion."}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-600">
                    {pairCount} pares / {themeCards.length} cartas
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
        <span>
          {filteredThemes.length === 0 ? "0 memoramas" : `Pagina ${currentPage} de ${pageCount} - ${filteredThemes.length} memoramas`}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={!canGoBack} onClick={() => onPageChange(currentPage - 1)}>Anterior</Button>
          <Button type="button" variant="secondary" disabled={!canGoNext} onClick={() => onPageChange(currentPage + 1)}>Siguiente</Button>
        </div>
      </div>
    </section>
  );
}

export function DifficultySelector({
  difficulty = "easy",
  onChange,
  disabled = false
}: {
  difficulty?: Difficulty;
  onChange?: (difficulty: Difficulty) => void;
  disabled?: boolean;
}) {
  return (
    <SelectField label="Dificultad" name="difficulty" value={difficulty} disabled={disabled} onChange={(event) => onChange?.(difficultyValue(event.target.value))}>
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
  const fallbackData = useMemoryData(!data);
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
  const fallbackData = useMemoryData(!data);
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
              <span className="text-sm text-slate-700">{difficultyLabel(row.difficulty)} - {row.score} puntos</span>
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}
