import {
  Smartphone,
  Laptop,
  Tv,
  Shirt,
  Sparkles,
  HeartPulse,
  Home,
  Car,
  Baby,
  ShoppingBag,
  Watch,
  Dumbbell,
  Wrench,
  Gamepad2,
  Briefcase,
  Store,
  type LucideIcon
} from 'lucide-react';

export interface CategoryDefinition {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  description: string;
  popularSearchTerms: string[];
}

export const MARKETPLACE_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'Phones & Tablets',
    name: 'Phones & Tablets',
    shortName: 'Phones',
    icon: Smartphone,
    description: 'Smartphones, iPhones, iPads, phone accessories, chargers, screen protectors',
    popularSearchTerms: ['iPhone', 'Samsung', 'iPad', 'AirPods', 'Pixel', 'Charger', 'Screen Protector']
  },
  {
    id: 'Computers & Tech',
    name: 'Computers & Tech',
    shortName: 'Computers',
    icon: Laptop,
    description: 'Laptops, MacBooks, PC hardware, monitors, keyboards, networking gear',
    popularSearchTerms: ['MacBook', 'Dell', 'HP Laptop', 'Monitor', 'Mechanical Keyboard', 'SSD', 'Router']
  },
  {
    id: 'Electronics & Appliances',
    name: 'Electronics & Appliances',
    shortName: 'Electronics',
    icon: Tv,
    description: 'Smart TVs, sound systems, home theaters, kitchen appliances, solar & power backup',
    popularSearchTerms: ['Smart TV', 'Soundbar', 'Microwave', 'Air Fryer', 'Solar Inverter', 'Generator']
  },
  {
    id: 'Fashion & Apparel',
    name: 'Fashion & Apparel',
    shortName: 'Fashion',
    icon: Shirt,
    description: 'Designer clothing, sneakers, boutique wear, African fabrics, bags, luxury streetwear',
    popularSearchTerms: ['Sneakers', 'Jordan', 'Boutique Dress', 'African Print', 'Kente', 'Leather Bag', 'Hoodie']
  },
  {
    id: 'Beauty, Hair & Fragrances',
    name: 'Beauty, Hair & Fragrances',
    shortName: 'Beauty & Hair',
    icon: Sparkles,
    description: 'Human hair wigs, frontals, skincare serums, makeup kits, luxury perfumes & colognes',
    popularSearchTerms: ['Bone Straight Wig', 'Lace Frontal', 'Skincare Serum', 'Perfume', 'Cologne', 'Makeup Kit']
  },
  {
    id: 'Health & Wellness',
    name: 'Health & Wellness',
    shortName: 'Health',
    icon: HeartPulse,
    description: 'Organic wellness products, vitamins, herbal remedies, body care, personal hygiene',
    popularSearchTerms: ['Vitamins', 'Whey Protein', 'Herbal Tea', 'Essential Oils', 'Body Butter']
  },
  {
    id: 'Home, Furniture & Living',
    name: 'Home, Furniture & Living',
    shortName: 'Home & Living',
    icon: Home,
    description: 'Living room sets, bed frames, orthopaedic mattresses, interior decor, kitchenware',
    popularSearchTerms: ['Sofa Set', 'Bed Frame', 'Mattress', 'Wall Art', 'Cookware Set', 'Dining Table']
  },
  {
    id: 'Automotive & Spare Parts',
    name: 'Automotive & Spare Parts',
    shortName: 'Automotive',
    icon: Car,
    description: 'Car accessories, replacement spare parts, motor oil, car electronics, diagnostic tools',
    popularSearchTerms: ['Car Dashcam', 'Headlights', 'Brake Pads', 'Engine Oil', 'Car Tracker', 'OBD2 Scanner']
  },
  {
    id: 'Baby, Kids & Toys',
    name: 'Baby, Kids & Toys',
    shortName: 'Baby & Kids',
    icon: Baby,
    description: 'Baby clothing, strollers, maternity gear, educational toys, children books',
    popularSearchTerms: ['Baby Stroller', 'Kids Clothing', 'Diapers', 'Educational Toys', 'Baby Crib']
  },
  {
    id: 'Groceries & Foodstuff',
    name: 'Groceries & Foodstuff',
    shortName: 'Groceries',
    icon: ShoppingBag,
    description: 'Bulk provisions, organic grains, spices, cooking oils, specialty drinks, Ghanaian foods',
    popularSearchTerms: ['Rice Bag', 'Cooking Oil', 'Imported Drinks', 'Organic Honey', 'Spices']
  },
  {
    id: 'Jewelry & Watches',
    name: 'Jewelry & Watches',
    shortName: 'Jewelry',
    icon: Watch,
    description: 'Luxury timepieces, gold & sterling silver jewelry, custom engraved chains, rings',
    popularSearchTerms: ['Rolex', 'Casio Watch', 'Gold Chain', 'Silver Ring', 'Custom Bracelet']
  },
  {
    id: 'Sports, Outdoors & Fitness',
    name: 'Sports, Outdoors & Fitness',
    shortName: 'Sports & Fitness',
    icon: Dumbbell,
    description: 'Gym dumbbells, resistance bands, treadmills, sports jerseys, outdoor camping gear',
    popularSearchTerms: ['Dumbbells', 'Treadmill', 'Football Jersey', 'Resistance Bands', 'Yoga Mat']
  },
  {
    id: 'Industrial, Tools & Hardware',
    name: 'Industrial, Tools & Hardware',
    shortName: 'Tools & Hardware',
    icon: Wrench,
    description: 'Power drill sets, electrical components, welding gear, construction & plumbing supplies',
    popularSearchTerms: ['Cordless Drill', 'Welding Machine', 'Socket Set', 'Toolbox', 'Solar Panels']
  },
  {
    id: 'Digital Goods & Gaming',
    name: 'Digital Goods & Gaming',
    shortName: 'Gaming & Digital',
    icon: Gamepad2,
    description: 'PlayStation, Xbox, Nintendo Switch, video games, software licenses, gaming headsets',
    popularSearchTerms: ['PS5', 'Xbox Series X', 'Nintendo Switch', 'FIFA / FC 24', 'Gaming Headset']
  },
  {
    id: 'Professional Services & Freelancing',
    name: 'Professional Services & Freelancing',
    shortName: 'Services',
    icon: Briefcase,
    description: 'Graphic design, software development, accounting, legal consultancy, logistics contracts',
    popularSearchTerms: ['Logo Design', 'Web Development', 'Consulting', 'Logistics Delivery', 'Translation']
  },
  {
    id: 'General Marketplace',
    name: 'General Marketplace',
    shortName: 'General',
    icon: Store,
    description: 'All other items, mixed merchandise, books, gift sets, stationery, seasonal products',
    popularSearchTerms: ['Gift Hamper', 'Books', 'Novelty Items', 'Party Supplies', 'Stationery']
  }
];

export const CATEGORY_NAMES = MARKETPLACE_CATEGORIES.map(c => c.name);
