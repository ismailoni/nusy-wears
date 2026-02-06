export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  video?: string;
  category: string;
  material: string;
  color: string;
  stock: number;
  defaultLensType?: string;
}

export const lensOptions = [
  { id: 'standard', label: 'Standard (No Prescription)', price: 0 },
  { id: 'blue-light', label: 'Blue Light Protection', price: 5000 },
  { id: 'photochromic', label: 'Photochromic (Transitions)', price: 15000 },
  { id: 'customized', label: 'Customized Optical Lens', price: 25000 },
];

export const lensCoatings = [
  { id: 'plain', label: 'Plain Lens', price: 0 },
  { id: 'anti-glare', label: 'Anti-Glare Coating', price: 8000 },
  { id: 'blue-light', label: 'Blue Light Filter', price: 10000 },
  { id: 'photochromic', label: 'Photochromic (Transitions)', price: 15000 },
  { id: 'premium', label: 'Premium Multi-Coating', price: 20000 },
];

export const frameColors = [
  'Black',
  'Brown',
  'Gold',
  'Silver',
  'Tortoise',
  'Clear',
  'Blue',
  'Red',
  'Green',
  'Pink',
  'White',
  'Gray',
];
