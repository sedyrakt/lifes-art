// src/types/categories.ts

export interface Categorie {
  id: number;
  nom: string;
  description: string;
  created_at: string;
}

export interface CategoriesStats {
  total: number;
  avecDescription: number;
  tauxCompletion: number;
}