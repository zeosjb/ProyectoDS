"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { createCommentAction, createDomainItemAction, deleteCommentAction, deleteDomainItemAction, toggleFavoriteAction, updateRecipeAction, type ActionResult } from "@/actions/domain.actions";
import { createClient } from "@/lib/supabase/client";
import { getEnvStatus } from "@/lib/env";
import { validateImageFileMeta } from "@/lib/domain/rules";
import { Button, EmptyState, Field, SelectField, TextareaField } from "@/components/ui";

type Recipe = {
  id: string;
  title: string;
  category: string;
  ingredients: string;
  instructions: string;
  imageUrl?: string;
  isOwner: boolean;
  isFavorite: boolean;
  comments: RecipeComment[];
};

type RecipeComment = {
  id: string;
  parentCommentId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  canDelete: boolean;
  isRecipeAuthor: boolean;
};

type IngredientRow = {
  id: string;
  name: string;
  quantity: string;
};

const initialAction: ActionResult = { ok: false, message: "" };

const recipeCategories = [
  "Almuerzo",
  "Postre",
  "Desayuno",
  "Cena",
  "Cocteles",
  "Mocktail",
  "Bebida",
  "Entrada",
  "Ensalada",
  "Sopa",
  "Snack",
  "Vegetariana",
  "Rapida"
];

function confirmTwice(firstMessage: string, secondMessage: string) {
  return window.confirm(firstMessage) && window.confirm(secondMessage);
}

export function DomainLanding({ title, description }: { title: string; description: string }) {
  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">Recetario colaborativo</p>
            <h1 className="mt-3 text-4xl font-bold text-slate-950 md:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800" href="/registro">
                Crear cuenta
              </Link>
              <Link className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" href="/login">
                Iniciar sesion
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-md bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">Organiza tus preparaciones</p>
              <p className="mt-1 text-sm text-slate-600">Guarda recetas con categoria, ingredientes, instrucciones e imagenes.</p>
            </div>
            <div className="rounded-md bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">Encuentra rapido lo que necesitas</p>
              <p className="mt-1 text-sm text-slate-600">Filtra por nombre, ingrediente o tipo de preparacion dentro de Recetas.</p>
            </div>
            <div className="rounded-md bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">Marca favoritas</p>
              <p className="mt-1 text-sm text-slate-600">Manten a mano las recetas que quieres repetir o revisar despues.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Crea</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Registra preparaciones propias con pasos claros y lista de ingredientes.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Consulta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Explora el recetario solo cuando hayas iniciado sesion.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Gestiona</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">Edita tus recetas, elimina registros propios y conserva tus favoritas.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export function DomainDashboard() {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshRecipes = useCallback(() => setRefreshKey((value) => value + 1), []);

  return (
    <div className="grid gap-6">
      <RecipeGrid
        title="Explorar recetas"
        refreshKey={refreshKey}
        onChanged={refreshRecipes}
        action={<Button onClick={() => setCreating(true)}>Agregar receta</Button>}
      />
      {creating ? <RecipeModal onClose={() => setCreating(false)} onChanged={refreshRecipes} /> : null}
    </div>
  );
}

function RecipeModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="create-recipe-title">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="create-recipe-title" className="text-xl font-bold text-slate-950">Agregar receta</h2>
          <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <RecipeForm onCancel={onClose} onSaved={() => {
          onChanged();
          onClose();
        }} />
      </div>
    </div>
  );
}

function EditRecipeModal({ recipe, onClose, onChanged }: { recipe: Partial<Recipe>; onClose: () => void; onChanged: () => void }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/50 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="edit-recipe-title">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="edit-recipe-title" className="text-xl font-bold text-slate-950">Editar receta</h2>
          <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <RecipeForm mode="edit" recipe={recipe} onCancel={onClose} onSaved={() => {
          onChanged();
          onClose();
        }} />
      </div>
    </div>
  );
}

export function AdminPanel() {
  return <EmptyState title="Administracion" description="Los administradores pueden moderar categorias, imagenes y recetas desde Supabase." />;
}

function useRecipes(refreshKey = 0) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getEnvStatus().supabaseReady) return;
    let mounted = true;
    void (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: claimsData } = await supabase.auth.getClaims();
      const userId = claimsData?.claims?.sub;
      const { data: recipeRows } = await supabase.from("recipes").select("id,title,category,instructions,image_path,owner_id").eq("is_deleted", false).order("created_at", { ascending: false });
      const { data: ingredientRows } = await supabase.from("recipe_ingredients").select("recipe_id,quantity,ingredients(name)");
      const { data: favorites } = userId ? await supabase.from("favorites").select("recipe_id").eq("user_id", userId) : { data: [] };
      const recipeIds = (recipeRows ?? []).map((recipe) => String(recipe.id));
      const { data: commentRows } = recipeIds.length
        ? await supabase.from("recipe_comments").select("id,recipe_id,parent_comment_id,user_id,author_name,body,created_at").in("recipe_id", recipeIds).order("created_at", { ascending: true })
        : { data: [] };
      const favoriteIds = new Set((favorites ?? []).map((favorite) => String(favorite.recipe_id)));

      if (mounted) {
        setRecipes((recipeRows ?? []).map((recipe) => {
          const recipeOwnerId = String(recipe.owner_id);
          const ingredients = (ingredientRows ?? [])
            .filter((item) => item.recipe_id === recipe.id)
            .map((item) => {
              const nested = item.ingredients as { name?: string } | null;
              return `${nested?.name ?? "Ingrediente"} - ${String(item.quantity)}`;
            })
            .join("\n");
          const imageUrl = recipe.image_path
            ? supabase.storage.from("recipe-images").getPublicUrl(String(recipe.image_path)).data.publicUrl
            : undefined;
          return {
            id: String(recipe.id),
            title: String(recipe.title),
            category: String(recipe.category),
            ingredients: ingredients || "Ingrediente - A gusto",
            instructions: Array.isArray(recipe.instructions) ? recipe.instructions.join("\n") : String(recipe.instructions ?? ""),
            imageUrl,
            isOwner: recipe.owner_id === userId,
            isFavorite: favoriteIds.has(String(recipe.id)),
            comments: (commentRows ?? [])
              .filter((comment) => comment.recipe_id === recipe.id)
              .map((comment) => ({
                id: String(comment.id),
                parentCommentId: comment.parent_comment_id ? String(comment.parent_comment_id) : null,
                authorName: String(comment.author_name || "Usuario"),
                body: String(comment.body),
                createdAt: String(comment.created_at),
                canDelete: comment.user_id === userId || recipeOwnerId === userId,
                isRecipeAuthor: comment.user_id === recipeOwnerId
              }))
          };
        }));
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  return { recipes, loading };
}

export function RecipeGrid({ title = "Explorar recetas", onlyMine = false, refreshKey = 0, onChanged, action }: { title?: string; onlyMine?: boolean; refreshKey?: number; onChanged?: () => void; action?: React.ReactNode }) {
  const { recipes, loading } = useRecipes(refreshKey);
  const [ingredient, setIngredient] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Todas");
  const [mineOnly, setMineOnly] = useState(onlyMine);

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      const byMine = !mineOnly || recipe.isOwner;
      const byIngredient = !ingredient || recipe.ingredients.toLowerCase().includes(ingredient.toLowerCase());
      const byName = !name || recipe.title.toLowerCase().includes(name.toLowerCase());
      const byCategory = category === "Todas" || recipe.category === category;
      return byMine && byIngredient && byName && byCategory;
    });
  }, [category, ingredient, mineOnly, name, recipes]);
  const emptyTitle = recipes.length ? "No hay recetas con esos filtros" : "No hay recetas disponibles";
  const emptyDescription = recipes.length ? "Cambia la busqueda, la categoria o el filtro de mis recetas." : "Agrega una receta para empezar el recetario.";

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">Busca recetas por nombre, ingrediente, categoria o creador.</p>
        </div>
        {action}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Buscar por nombre" name="name-filter" value={name} onChange={(event) => setName(event.target.value)} />
        <IngredientFilter value={ingredient} onChange={setIngredient} />
        <SelectField label="Categoria" name="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>Todas</option>
          {recipeCategories.map((option) => <option key={option}>{option}</option>)}
        </SelectField>
        <label className="flex min-h-16 items-end gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          <input className="mb-1 h-4 w-4 rounded border-slate-300 text-emerald-700" type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} />
          Solo mis recetas
        </label>
      </div>
      {loading ? <p className="text-sm text-slate-600">Cargando recetas...</p> : null}
      <div className="grid gap-4 md:grid-cols-2">{filtered.map((recipe) => <RecipeCard key={recipe.id} {...recipe} onChanged={onChanged} />)}</div>
      {!loading && !filtered.length ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}
    </section>
  );
}

export function RecipeCard(recipe: Partial<Recipe> & { onChanged?: () => void }) {
  const {
    id = "r1",
    title = "Receta demo",
    category = "Categoria",
    ingredients = "Ingrediente - A gusto",
    instructions = "Paso 1\nPaso 2",
    imageUrl,
    isOwner = false,
    isFavorite = false,
    comments = [],
    onChanged
  } = recipe;
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      {imageUrl ? <Image className="aspect-video w-full rounded-md object-cover" src={imageUrl} alt="" width={640} height={360} /> : <div className="aspect-video rounded-md bg-rose-100" aria-hidden />}
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-600">{category}</p>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{ingredients}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <FavoriteButton recipeId={id} saved={isFavorite} onChanged={onChanged} />
        {isOwner ? <Button variant="secondary" onClick={() => setEditing(true)}>Editar</Button> : null}
        {isOwner ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (!confirmTwice("Primera confirmacion: quieres eliminar esta receta?", "Segunda confirmacion: esta accion eliminara la receta. Confirmas?")) return;
              startTransition(async () => {
                const result = await deleteDomainItemAction(id);
                setMessage(result.message);
                if (result.ok) onChanged?.();
              });
            }}
          >
            Eliminar
          </Button>
        ) : null}
      </div>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
      {editing ? <EditRecipeModal recipe={{ id, title, category, ingredients, instructions }} onClose={() => setEditing(false)} onChanged={() => onChanged?.()} /> : null}
      <CommentsSection recipeId={id} comments={comments} onChanged={onChanged} />
    </article>
  );
}

function CommentsSection({ recipeId, comments, onChanged }: { recipeId: string; comments: RecipeComment[]; onChanged?: () => void }) {
  const topLevel = comments.filter((comment) => !comment.parentCommentId);

  return (
    <section className="mt-5 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-bold text-slate-950">Comentarios ({comments.length})</h4>
      <div className="mt-3 grid gap-3">
        {topLevel.length ? (
          topLevel.map((comment) => (
            <CommentThread key={comment.id} comment={comment} comments={comments} recipeId={recipeId} onChanged={onChanged} />
          ))
        ) : (
          <p className="text-sm text-slate-600">Todavia no hay comentarios.</p>
        )}
      </div>
      <div className="mt-4">
        <CommentForm recipeId={recipeId} onChanged={onChanged} />
      </div>
    </section>
  );
}

function CommentThread({ comment, comments, recipeId, onChanged, depth = 0 }: { comment: RecipeComment; comments: RecipeComment[]; recipeId: string; onChanged?: () => void; depth?: number }) {
  const [expanded, setExpanded] = useState(depth > 0);
  const [replying, setReplying] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const replies = comments.filter((reply) => reply.parentCommentId === comment.id);
  const isAccordion = depth === 0;
  const preview = comment.body.length > 90 ? comment.body.slice(0, 90).trim() + "..." : comment.body;

  function handleDelete() {
    if (!window.confirm("Quieres eliminar este comentario?")) return;

    startTransition(async () => {
      const result = await deleteCommentAction(comment.id);
      setMessage(result.message);
      if (result.ok) onChanged?.();
    });
  }

  return (
    <article className={"grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 " + (depth ? "ml-4" : "")}>
      {isAccordion ? (
        <button
          aria-expanded={expanded}
          className="grid gap-2 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-slate-950">{comment.authorName}</strong>
              {comment.isRecipeAuthor ? <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Autor</span> : null}
            </span>
            <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleDateString("es-CL")}</span>
          </span>
          <span className="line-clamp-2 text-sm text-slate-700">{preview}</span>
          <span className="text-xs font-semibold text-emerald-700">
            {expanded ? "Ocultar hilo" : "Ver hilo"} - {replies.length} {replies.length === 1 ? "respuesta" : "respuestas"}
          </span>
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-slate-950">{comment.authorName}</strong>
            {comment.isRecipeAuthor ? <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Autor</span> : null}
          </div>
          <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleDateString("es-CL")}</span>
        </div>
      )}
      {(!isAccordion || expanded) ? <p className="whitespace-pre-line text-sm text-slate-700">{comment.body}</p> : null}
      {(!isAccordion || expanded) ? <div className="flex flex-wrap gap-2">
        <Button className="px-3 py-1" type="button" variant="secondary" onClick={() => setReplying((value) => !value)}>
          {replying ? "Cancelar respuesta" : "Responder"}
        </Button>
        {comment.canDelete ? (
          <Button className="px-3 py-1" type="button" variant="danger" disabled={pending} onClick={handleDelete}>
            Eliminar
          </Button>
        ) : null}
      </div> : null}
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      {replying && (!isAccordion || expanded) ? <CommentForm recipeId={recipeId} parentCommentId={comment.id} onCancel={() => setReplying(false)} onChanged={onChanged} /> : null}
      {replies.length && (!isAccordion || expanded) ? (
        <div className="grid gap-2">
          {replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} comments={comments} recipeId={recipeId} onChanged={onChanged} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CommentForm({ recipeId, parentCommentId = "", onCancel, onChanged }: { recipeId: string; parentCommentId?: string; onCancel?: () => void; onChanged?: () => void }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(createCommentAction, initialAction);
  const formRef = useRef<HTMLFormElement>(null);
  const onChangedRef = useRef(onChanged);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onChangedRef.current = onChanged;
    onCancelRef.current = onCancel;
  }, [onChanged, onCancel]);

  useEffect(() => {
    if (!state.ok) return;

    formRef.current?.reset();
    onChangedRef.current?.();
    if (parentCommentId) onCancelRef.current?.();
  }, [parentCommentId, state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-2">
      <input type="hidden" name="recipeId" value={recipeId} readOnly />
      <input type="hidden" name="parentCommentId" value={parentCommentId} readOnly />
      <TextareaField label={parentCommentId ? "Responder comentario" : "Nuevo comentario"} name="body" placeholder={parentCommentId ? "Escribe una respuesta..." : "Comparte una duda, consejo o experiencia..."} required />
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <div className="flex justify-end gap-2">
        {onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button> : null}
        <Button type="submit">{parentCommentId ? "Responder" : "Comentar"}</Button>
      </div>
    </form>
  );
}

export function RecipeDetail(props: Partial<Recipe>) {
  return <section className="rounded-md border border-slate-200 bg-white p-5"><RecipeCard {...props} /><p className="mt-4 text-sm text-slate-700">Instrucciones, ingredientes, imagen y favoritos conectados a Supabase.</p></section>;
}

export function RecipeForm({ mode = "create", recipe, onCancel, onSaved }: { mode?: "create" | "edit"; recipe?: Partial<Recipe>; onCancel?: () => void; onSaved?: () => void }) {
  const action = mode === "edit" ? updateRecipeAction : createDomainItemAction;
  const [state, formAction] = useActionState<ActionResult, FormData>(action, initialAction);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  useEffect(() => {
    if (state.ok) onSavedRef.current?.();
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4">
      {recipe?.id ? <input type="hidden" name="id" value={recipe.id} /> : null}
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Nombre" name="title" defaultValue={recipe?.title} required />
      <SelectField label="Categoria" name="category" defaultValue={recipe?.category ?? "Almuerzo"}>
        {recipeCategories.map((option) => <option key={option}>{option}</option>)}
      </SelectField>
      <IngredientInput defaultValue={recipe?.ingredients} />
      <TextareaField label="Instrucciones" name="instructions" defaultValue={recipe?.instructions} required />
      <ImageUploader />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button> : null}
        <Button type="submit">{mode === "edit" ? "Actualizar receta" : "Guardar receta"}</Button>
      </div>
    </form>
  );
}

export function IngredientInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [rows, setRows] = useState<IngredientRow[]>(() => parseIngredientRows(defaultValue));
  const serialized = rows
    .map((row) => {
      const name = row.name.trim();
      const quantity = row.quantity.trim();
      if (!name) return "";
      return `${name} - ${quantity || "A gusto"}`;
    })
    .filter(Boolean)
    .join("\n");

  function updateRow(id: string, field: "name" | "quantity", value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function addRow() {
    setRows((current) => [...current, createIngredientRow()]);
  }

  function removeRow(id: string) {
    setRows((current) => current.length === 1 ? current : current.filter((row) => row.id !== id));
  }

  return (
    <section className="grid gap-3">
      <div>
        <span className="text-sm font-medium text-slate-950">Ingredientes</span>
        <p className="mt-1 text-xs text-slate-600">Agrega cada ingrediente con su cantidad. Puedes dejar la cantidad en blanco.</p>
      </div>
      <input type="hidden" name="ingredients" value={serialized} readOnly required />
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_0.75fr_auto]" key={row.id}>
            <label className="grid gap-1 text-sm font-medium">
              <span>Ingrediente {index + 1}</span>
              <input className="rounded-md border border-slate-300 px-3 py-2" value={row.name} onChange={(event) => updateRow(row.id, "name", event.target.value)} placeholder="Ej: Harina" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              <span>Cantidad</span>
              <input className="rounded-md border border-slate-300 px-3 py-2" value={row.quantity} onChange={(event) => updateRow(row.id, "quantity", event.target.value)} placeholder="Ej: 2 tazas" />
            </label>
            <Button className="self-end" type="button" variant="secondary" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
              Quitar
            </Button>
          </div>
        ))}
      </div>
      <Button className="justify-self-start" type="button" variant="secondary" onClick={addRow}>
        Agregar ingrediente
      </Button>
    </section>
  );
}

function createIngredientRow(name = "", quantity = ""): IngredientRow {
  return { id: crypto.randomUUID(), name, quantity };
}

function parseIngredientRows(value: string): IngredientRow[] {
  const rows = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", ...quantityParts] = line.split("-");
      return createIngredientRow(name.trim(), quantityParts.join("-").trim());
    });

  return rows.length ? rows : [createIngredientRow()];
}

export function IngredientFilter({ value = "", onChange }: { value?: string; onChange?: (value: string) => void }) {
  return <Field label="Buscar por ingrediente" name="ingredient-filter" value={value} onChange={(event) => onChange?.(event.target.value)} />;
}

export function ImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");

  function setFile(file?: File) {
    if (!file) {
      setMessage("");
      return;
    }

    const valid = validateImageFileMeta(file.type, file.size);
    setMessage(valid ? `Imagen lista: ${file.name}` : "Usa PNG, JPG o WEBP de hasta 2 MB.");
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file || !inputRef.current) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setFile(file);
  }

  return (
    <label
      className={"grid cursor-pointer place-items-center rounded-md border border-dashed p-6 text-center text-sm transition " + (dragging ? "border-emerald-600 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className="font-semibold text-slate-950">Arrastra una imagen o haz clic para seleccionarla</span>
      <span className="mt-1 text-xs text-slate-600">PNG, JPG o WEBP hasta 2 MB</span>
      <input ref={inputRef} className="sr-only" name="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0])} />
      {message ? <span className="mt-3 text-sm text-slate-700">{message}</span> : null}
    </label>
  );
}

export function FavoriteButton({ recipeId = "r1", saved = false, onChanged }: { recipeId?: string; saved?: boolean; onChanged?: () => void }) {
  const [current, setCurrent] = useState(saved);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleToggleFavorite() {
    if (current && !confirmTwice("Primera confirmacion: quieres quitar esta receta de favoritos?", "Segunda confirmacion: se eliminara de tus favoritos. Confirmas?")) return;

    startTransition(async () => {
      const result = await toggleFavoriteAction(recipeId);
      if (result.ok) setCurrent((value) => !value);
      if (result.ok) onChanged?.();
      setMessage(result.message);
    });
  }

  return (
    <span>
      <Button className="mt-0" variant="secondary" disabled={pending} onClick={handleToggleFavorite}>
        {current ? "Guardada" : "Guardar favorita"}
      </Button>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </span>
  );
}

export function MyRecipes() {
  return <section className="grid gap-4"><h2 className="text-2xl font-bold">Mis recetas</h2><RecipeGrid title="Recetas creadas por mi" onlyMine /></section>;
}
