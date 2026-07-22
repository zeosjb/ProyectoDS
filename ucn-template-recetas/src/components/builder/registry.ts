import type { RegisteredComponent } from "@builder.io/sdk-react-nextjs";
import { RecipeCard, RecipeGrid, RecipeDetail, RecipeForm, IngredientInput, IngredientFilter, ImageUploader, FavoriteButton, MyRecipes } from "@/components/domain";

export const customComponents: RegisteredComponent[] = [
  {
    component: RecipeCard,
    name: "RecipeCard",
    inputs: [
      { name: "title", type: "string", defaultValue: "RecipeCard" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: RecipeGrid,
    name: "RecipeGrid",
    inputs: [
      { name: "title", type: "string", defaultValue: "RecipeGrid" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: RecipeDetail,
    name: "RecipeDetail",
    inputs: [
      { name: "title", type: "string", defaultValue: "RecipeDetail" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: RecipeForm,
    name: "RecipeForm",
    inputs: [
      { name: "title", type: "string", defaultValue: "RecipeForm" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: IngredientInput,
    name: "IngredientInput",
    inputs: [
      { name: "title", type: "string", defaultValue: "IngredientInput" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: IngredientFilter,
    name: "IngredientFilter",
    inputs: [
      { name: "title", type: "string", defaultValue: "IngredientFilter" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: ImageUploader,
    name: "ImageUploader",
    inputs: [
      { name: "title", type: "string", defaultValue: "ImageUploader" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: FavoriteButton,
    name: "FavoriteButton",
    inputs: [
      { name: "title", type: "string", defaultValue: "FavoriteButton" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MyRecipes,
    name: "MyRecipes",
    inputs: [
      { name: "title", type: "string", defaultValue: "MyRecipes" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  }
];
