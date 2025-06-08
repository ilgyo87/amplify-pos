import { ImageSourcePropType } from 'react-native';

// Import all garment images
const garmentImages = {
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

export interface GarmentImage {
  key: string;
  name: string;
  source: ImageSourcePropType;
}

// Convert to array with display names
export const GARMENT_IMAGES: GarmentImage[] = Object.entries(garmentImages).map(([key, source]) => ({
  key,
  name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  source,
}));

// Get image source by key
export const getGarmentImageByKey = (key: string): ImageSourcePropType | null => {
  const image = GARMENT_IMAGES.find(img => img.key === key);
  return image ? image.source : null;
};

// Get default product image (t-shirt)
export const getDefaultGarmentImage = (): ImageSourcePropType => {
  return garmentImages['t-shirt'];
};