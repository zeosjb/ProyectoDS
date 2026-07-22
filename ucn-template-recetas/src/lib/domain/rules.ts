const validImageTypes = ["image/png", "image/jpeg", "image/webp"];

export function canEditRecipe(ownerId: string, userId: string) {
  return ownerId === userId;
}

export function validateImageFileMeta(type: string, size: number) {
  return validImageTypes.includes(type) && size <= 2 * 1024 * 1024;
}
