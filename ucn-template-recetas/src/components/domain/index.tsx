"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { createDomainItemAction, deleteDomainItemAction, toggleFavoriteAction, updateRecipeAction, type ActionResult } from "@/actions/domain.actions";
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
};

const demoRecipes: Recipe[] = [
  { id: "r1", title: "Ensalada nortina", category: "Vegetariana", ingredients: "Tomate - 2 unidades\nAlbahaca - 4 hojas", instructions: "Lavar ingredientes.\nMezclar y servir.", isOwner: true, isFavorite: false },
  { id: "r2", title: "Arroz con pollo", category: "Almuerzo", ingredients: "Arroz - 1 taza\nPollo - 200 g", instructions: "Cocinar el arroz.\nDorar el pollo y mezclar.", isOwner: false, isFavorite: true }
];

const initialAction: ActionResult = { ok: false, message: "" };

export function DomainLanding({ title, description }: { title: string; description: string }) {
  return <main className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-4xl font-bold">{title}</h1><p className="mt-3 max-w-2xl text-slate-700">{description}</p><section className="mt-8"><RecipeGrid /></section></main>;
}

export function DomainDashboard() {
  return <div className="grid gap-8"><RecipeForm /><MyRecipes /><RecipeGrid title="Explorar recetas" /></div>;
}

export function AdminPanel() {
  return <EmptyState title="Administracion" description="Los administradores pueden moderar categorias, imagenes y recetas desde Supabase." />;
}

function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(demoRecipes);
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
      const favoriteIds = new Set((favorites ?? []).map((favorite) => String(favorite.recipe_id)));

      if (mounted && recipeRows?.length) {
        setRecipes(recipeRows.map((recipe) => {
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
            isFavorite: favoriteIds.has(String(recipe.id))
          };
        }));
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { recipes, loading };
}

export function RecipeGrid({ title = "Explorar recetas", onlyMine = false }: { title?: string; onlyMine?: boolean }) {
  const { recipes, loading } = useRecipes();
  const [ingredient, setIngredient] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Todas");

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      const byMine = !onlyMine || recipe.isOwner;
      const byIngredient = !ingredient || recipe.ingredients.toLowerCase().includes(ingredient.toLowerCase());
      const byName = !name || recipe.title.toLowerCase().includes(name.toLowerCase());
      const byCategory = category === "Todas" || recipe.category === category;
      return byMine && byIngredient && byName && byCategory;
    });
  }, [category, ingredient, name, onlyMine, recipes]);

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Buscar por nombre" name="name-filter" value={name} onChange={(event) => setName(event.target.value)} />
        <IngredientFilter value={ingredient} onChange={setIngredient} />
        <SelectField label="Categoria" name="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option>Todas</option><option>Almuerzo</option><option>Postre</option><option>Vegetariana</option><option>Rapida</option></SelectField>
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {loading ? <p className="text-sm text-slate-600">Cargando recetas...</p> : null}
      <div className="grid gap-4 md:grid-cols-2">{filtered.map((recipe) => <RecipeCard key={recipe.id} {...recipe} />)}</div>
      {!filtered.length ? <EmptyState title="Sin recetas" description="Prueba con otro filtro o crea una receta." /> : null}
    </section>
  );
}

export function RecipeCard(recipe: Partial<Recipe>) {
  const {
    id = "r1",
    title = "Receta demo",
    category = "Categoria",
    ingredients = "Ingrediente - A gusto",
    instructions = "Paso 1\nPaso 2",
    imageUrl,
    isOwner = false,
    isFavorite = false
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
        <FavoriteButton recipeId={id} saved={isFavorite} />
        {isOwner ? <Button variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "Cerrar edicion" : "Editar"}</Button> : null}
        {isOwner ? <Button variant="danger" disabled={pending} onClick={() => { if (window.confirm("Confirmas eliminar esta receta?")) startTransition(async () => { const result = await deleteDomainItemAction(id); setMessage(result.message); }); }}>Eliminar</Button> : null}
      </div>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
      {editing ? <RecipeForm mode="edit" recipe={{ id, title, category, ingredients, instructions }} /> : null}
    </article>
  );
}

export function RecipeDetail(props: Partial<Recipe>) {
  return <section className="rounded-md border border-slate-200 bg-white p-5"><RecipeCard {...props} /><p className="mt-4 text-sm text-slate-700">Instrucciones, ingredientes, imagen y favoritos conectados a Supabase.</p></section>;
}

export function RecipeForm({ mode = "create", recipe }: { mode?: "create" | "edit"; recipe?: Partial<Recipe> }) {
  const action = mode === "edit" ? updateRecipeAction : createDomainItemAction;
  const [state, formAction] = useActionState<ActionResult, FormData>(action, initialAction);
  return (
    <form action={formAction} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">{mode === "edit" ? "Editar receta" : "Crear receta"}</h2>
      {recipe?.id ? <input type="hidden" name="id" value={recipe.id} /> : null}
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Nombre" name="title" defaultValue={recipe?.title} required />
      <SelectField label="Categoria" name="category" defaultValue={recipe?.category ?? "Almuerzo"}><option>Almuerzo</option><option>Postre</option><option>Vegetariana</option><option>Rapida</option></SelectField>
      <IngredientInput defaultValue={recipe?.ingredients} />
      <TextareaField label="Instrucciones" name="instructions" defaultValue={recipe?.instructions} required />
      <ImageUploader />
      <Button type="submit">{mode === "edit" ? "Actualizar receta" : "Guardar receta"}</Button>
    </form>
  );
}

export function IngredientInput({ defaultValue = "" }: { defaultValue?: string }) {
  return <TextareaField label="Ingredientes (uno por linea: nombre - cantidad)" name="ingredients" defaultValue={defaultValue} required />;
}

export function IngredientFilter({ value = "", onChange }: { value?: string; onChange?: (value: string) => void }) {
  return <Field label="Buscar por ingrediente" name="ingredient-filter" value={value} onChange={(event) => onChange?.(event.target.value)} />;
}

export function ImageUploader() {
  const [message, setMessage] = useState("");
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>Imagen</span>
      <input name="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setMessage(!file || validateImageFileMeta(file.type, file.size) ? "Imagen valida." : "Usa PNG, JPG o WEBP de hasta 2 MB."); }} />
      {message ? <span className="text-sm text-slate-700">{message}</span> : null}
    </label>
  );
}

export function FavoriteButton({ recipeId = "r1", saved = false }: { recipeId?: string; saved?: boolean }) {
  const [current, setCurrent] = useState(saved);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <span><Button className="mt-0" variant="secondary" disabled={pending} onClick={() => startTransition(async () => { const result = await toggleFavoriteAction(recipeId); if (result.ok) setCurrent((value) => !value); setMessage(result.message); })}>{current ? "Guardada" : "Guardar favorita"}</Button>{message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}</span>;
}

export function MyRecipes() {
  return <section className="grid gap-4"><h2 className="text-2xl font-bold">Mis recetas</h2><RecipeGrid title="Recetas creadas por mi" onlyMine /></section>;
}
