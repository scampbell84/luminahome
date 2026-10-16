export type ShoppingCategory = 
  | 'Produce'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Meat & Seafood'
  | 'Pantry'
  | 'Snacks & Drinks'
  | 'Household'
  | 'Other';

export interface ShoppingItem {
  id: string;
  text: string;
  category: ShoppingCategory;
  completed: boolean;
  quantity?: string;
  createdAt: string;
  addedBy?: string;
}
