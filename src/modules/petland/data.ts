import type { ShopItem, Brochure } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find((img) => img.id === id)?.imageUrl || '';
const getHint = (id: string) => PlaceHolderImages.find((img) => img.id === id)?.imageHint || '';

export const mockShopItems: ShopItem[] = [
  { id: 'accessory-hat', name: 'Top Hat', price: 50, type: 'accessory', image: getImage('accessory-hat'), imageHint: getHint('accessory-hat') },
  { id: 'accessory-scarf', name: 'Cozy Scarf', price: 40, type: 'accessory', image: getImage('accessory-scarf'), imageHint: getHint('accessory-scarf') },
  { id: 'accessory-glasses', name: 'Smart Glasses', price: 60, type: 'accessory', image: getImage('accessory-glasses'), imageHint: getHint('accessory-glasses') },
  { id: 'ticket-paris', name: 'Ticket to Paris', price: 100, type: 'ticket', image: getImage('ticket-paris'), imageHint: getHint('ticket-paris') },
  { id: 'ticket-tokyo', name: 'Ticket to Tokyo', price: 150, type: 'ticket', image: getImage('ticket-tokyo'), imageHint: getHint('ticket-tokyo') },
  { id: 'ticket-egypt', name: 'Ticket to Egypt', price: 200, type: 'ticket', image: getImage('ticket-egypt'), imageHint: getHint('ticket-egypt') },
];

export const mockBrochures: Brochure[] = [
  { id: 'brochure-paris', name: 'A Trip to Paris', image: getImage('brochure-paris'), imageHint: getHint('brochure-paris') },
  { id: 'brochure-tokyo', name: 'A Trip to Tokyo', image: getImage('brochure-tokyo'), imageHint: getHint('brochure-tokyo') },
  { id: 'brochure-egypt', name: 'A Trip to Egypt', image: getImage('brochure-egypt'), imageHint: getHint('brochure-egypt') },
];
