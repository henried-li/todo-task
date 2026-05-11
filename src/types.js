export const PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
  "#6366F1", "#84CC16", "#06B6D4", "#A855F7"
];

export function findType(types, id) {
  return types.find(t => t.id === id) || types[0];
}

export function newTypeId(name) {
  const slug = (name || "type").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "type"}-${Math.random().toString(36).slice(2, 6)}`;
}
