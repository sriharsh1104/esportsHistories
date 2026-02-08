/**
 * Esports org merchandise - apparel, shoes, etc.
 */
export type ShopItem = {
  id: string;
  name: string;
  org: string;
  category: 'apparel' | 'shoes' | 'accessories';
  price: number;
  imageUrl: string;
};

export type ShopCategory = {
  id: string;
  title: string;
  icon: string;
  items: ShopItem[];
};

export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: 'apparel',
    title: 'Apparel',
    icon: 'shopping-bag',
    items: [
      { id: 'fnatic-jersey', name: 'Fnatic Pro Jersey', org: 'Fnatic', category: 'apparel', price: 3499, imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop' },
      { id: 'c9-hoodie', name: 'Cloud9 Zip Hoodie', org: 'Cloud9', category: 'apparel', price: 4999, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop' },
      { id: 'g2-tee', name: 'G2 Esports Tee', org: 'G2', category: 'apparel', price: 1999, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop' },
      { id: 'tl-jersey', name: 'Team Liquid Jersey', org: 'Team Liquid', category: 'apparel', price: 4299, imageUrl: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop' },
      { id: '100t-hoodie', name: '100 Thieves Crewneck', org: '100 Thieves', category: 'apparel', price: 5499, imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop' },
      { id: 'sentinel-jersey', name: 'Sentinels Valorant Jersey', org: 'Sentinels', category: 'apparel', price: 3999, imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop' },
    ],
  },
  {
    id: 'shoes',
    title: 'Shoes & Footwear',
    icon: 'star',
    items: [
      { id: 'fnatic-sneakers', name: 'Fnatic x Nike Collab Sneakers', org: 'Fnatic', category: 'shoes', price: 8999, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop' },
      { id: 'c9-shoes', name: 'Cloud9 Pro Sneakers', org: 'Cloud9', category: 'shoes', price: 6499, imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop' },
      { id: 'g2-slides', name: 'G2 Team Slides', org: 'G2', category: 'shoes', price: 2499, imageUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=400&fit=crop' },
      { id: '100t-sneakers', name: '100 Thieves Lifestyle Sneakers', org: '100 Thieves', category: 'shoes', price: 7499, imageUrl: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop' },
    ],
  },
  {
    id: 'accessories',
    title: 'Accessories',
    icon: 'tag',
    items: [
      { id: 'fnatic-cap', name: 'Fnatic Snapback Cap', org: 'Fnatic', category: 'accessories', price: 1299, imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop' },
      { id: 'g2-cap', name: 'G2 Dad Hat', org: 'G2', category: 'accessories', price: 999, imageUrl: 'https://images.unsplash.com/photo-1591522810696-02d600215745?w=400&h=400&fit=crop' },
      { id: 'c9-backpack', name: 'Cloud9 Gaming Backpack', org: 'Cloud9', category: 'accessories', price: 3499, imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
      { id: 'tl-mousepad', name: 'Team Liquid XXL Mousepad', org: 'Team Liquid', category: 'accessories', price: 1499, imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop' },
    ],
  },
];
