import { ImageSourcePropType } from 'react-native';

// Direct imports of all product images for Metro bundler static analysis
const GARMENT_IMAGES = {
  'blankets': require('./garments/blankets.png'),
  'blazer': require('./garments/blazer.png'),
  'boxed-shirts': require('./garments/boxed-shirts.png'),
  'buttons': require('./garments/buttons.png'),
  'clothes-cut': require('./garments/clothes-cut.png'),
  'comforter': require('./garments/comforter.png'),
  'curtain': require('./garments/curtain.png'),
  'dress-shirt': require('./garments/dress-shirt.png'),
  'dress': require('./garments/dress.png'),
  'hem': require('./garments/hem.png'),
  'jacket': require('./garments/jacket.png'),
  'jeans': require('./garments/jeans.png'),
  'jersey': require('./garments/jersey.png'),
  'kids-clothes': require('./garments/kids-clothes.png'),
  'leather-jacket': require('./garments/leather-jacket.png'),
  'pants': require('./garments/pants.png'),
  'patch': require('./garments/patch.png'),
  'pillow': require('./garments/pillow.png'),
  'polo': require('./garments/polo.png'),
  'rug': require('./garments/rug.png'),
  'sari': require('./garments/sari.png'),
  'sewing': require('./garments/sewing.png'),
  'shirt-cut': require('./garments/shirt-cut.png'),
  'shoes': require('./garments/shoes.png'),
  'skirt': require('./garments/skirt.png'),
  'socks': require('./garments/socks.png'),
  'suit': require('./garments/suit.png'),
  't-shirt': require('./garments/t-shirt.png'),
  'take-in': require('./garments/take-in.png'),
  'tshirt': require('./garments/tshirt.png'),
  'waist': require('./garments/waist.png'),
  'washing-clothes': require('./garments/washing-clothes.png'),
  'wedding-dress': require('./garments/wedding-dress.png'),
  'winter-coat': require('./garments/winter-coat.png'),
  'winter-hat': require('./garments/winter-hat.png'),
  'woman-suit': require('./garments/woman-suit.png'),
  'zipper': require('./garments/zipper.png'),
};

// Mapping of product names/types to garment image keys
const PRODUCT_IMAGE_MAP: { [key: string]: keyof typeof GARMENT_IMAGES } = {
  // T-shirts and casual wear
  'tshirt': 't-shirt',
  't-shirt': 't-shirt',
  'tee': 't-shirt',
  'casual shirt': 't-shirt',
  
  // Dress shirts and formal shirts
  'shirt': 'dress-shirt',
  'dress shirt': 'dress-shirt',
  'button-up': 'dress-shirt',
  'formal shirt': 'dress-shirt',
  'business shirt': 'dress-shirt',
  
  // Polo shirts
  'polo': 'polo',
  'polo shirt': 'polo',
  
  // Jackets and blazers
  'jacket': 'jacket',
  'blazer': 'blazer',
  'sport coat': 'blazer',
  'leather jacket': 'leather-jacket',
  'winter coat': 'winter-coat',
  'outerwear': 'jacket',
  
  // Dresses
  'dress': 'dress',
  'gown': 'dress',
  'evening dress': 'dress',
  'wedding dress': 'wedding-dress',
  'formal dress': 'dress',
  
  // Suits
  'suit': 'suit',
  'business suit': 'suit',
  'formal suit': 'suit',
  'woman suit': 'woman-suit',
  'womens suit': 'woman-suit',
  
  // Pants and bottoms
  'pants': 'pants',
  'trousers': 'pants',
  'slacks': 'pants',
  'dress pants': 'pants',
  'jeans': 'jeans',
  'denim': 'jeans',
  'skirt': 'skirt',
  
  // Footwear
  'shoes': 'shoes',
  'boots': 'shoes',
  'sneakers': 'shoes',
  'footwear': 'shoes',
  'socks': 'socks',
  
  // Children's wear
  'kids': 'kids-clothes',
  'children': 'kids-clothes',
  'youth': 'kids-clothes',
  'kids clothes': 'kids-clothes',
  
  // Home items
  'blanket': 'blankets',
  'blankets': 'blankets',
  'comforter': 'comforter',
  'pillow': 'pillow',
  'cushion': 'pillow',
  'curtain': 'curtain',
  'curtains': 'curtain',
  'drapes': 'curtain',
  'rug': 'rug',
  'carpet': 'rug',
  
  // Accessories and alterations
  'buttons': 'buttons',
  'zipper': 'zipper',
  'patch': 'patch',
  'hem': 'hem',
  'alteration': 'sewing',
  'repair': 'sewing',
  'sewing': 'sewing',
  
  // Winter wear
  'winter hat': 'winter-hat',
  'hat': 'winter-hat',
  'beanie': 'winter-hat',
  
  // Special items
  'jersey': 'jersey',
  'sports jersey': 'jersey',
  'sari': 'sari',
  'traditional wear': 'sari',
};

// Default fallback image
const DEFAULT_IMAGE = GARMENT_IMAGES['t-shirt'];

/**
 * Get product image based on product name or image name
 * Uses static imports for reliable Metro bundler compatibility
 */
export const getProductImage = (productName: string, imageName?: string): ImageSourcePropType => {
  const searchName = (imageName || productName || '').toLowerCase().trim();
  
  // Try direct key match first
  if (GARMENT_IMAGES[searchName as keyof typeof GARMENT_IMAGES]) {
    return GARMENT_IMAGES[searchName as keyof typeof GARMENT_IMAGES];
  }
  
  // Try product mapping
  if (PRODUCT_IMAGE_MAP[searchName]) {
    return GARMENT_IMAGES[PRODUCT_IMAGE_MAP[searchName]];
  }
  
  // Try partial matches
  for (const [productKey, imageKey] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (searchName.includes(productKey) || productKey.includes(searchName)) {
      return GARMENT_IMAGES[imageKey];
    }
  }
  
  // Return default image
  return DEFAULT_IMAGE;
};

/**
 * Get category image based on category name
 */
export const getCategoryImage = (categoryName: string): ImageSourcePropType => {
  const searchName = categoryName.toLowerCase().trim();
  
  // Category-specific mappings
  const categoryMap: { [key: string]: keyof typeof GARMENT_IMAGES } = {
    'shirts': 'dress-shirt',
    'tops': 't-shirt',
    'bottoms': 'pants',
    'outerwear': 'jacket',
    'formal': 'suit',
    'casual': 'polo',
    'footwear': 'shoes',
    'children': 'kids-clothes',
    'home': 'curtain',
    'bedding': 'blankets',
    'accessories': 'buttons',
    'alterations': 'sewing',
    'winter': 'winter-coat',
  };
  
  // Try category mapping
  if (categoryMap[searchName]) {
    return GARMENT_IMAGES[categoryMap[searchName]];
  }
  
  // Try partial matches
  for (const [categoryKey, imageKey] of Object.entries(categoryMap)) {
    if (searchName.includes(categoryKey) || categoryKey.includes(searchName)) {
      return GARMENT_IMAGES[imageKey];
    }
  }
  
  // Default to general clothing image
  return GARMENT_IMAGES['clothes-cut'];
};

/**
 * Get default product image
 */
export const getDefaultProductImage = (): ImageSourcePropType => {
  return DEFAULT_IMAGE;
};

/**
 * Get all available image keys for debugging
 */
export const getAvailableImageKeys = (): string[] => {
  return Object.keys(GARMENT_IMAGES);
};