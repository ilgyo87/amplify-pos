import { ImageSourcePropType } from 'react-native';
import { getGarmentImageByKey, getDefaultGarmentImage } from './garmentImages';

// Use existing garment images from the assets folder
const defaultProductImage = getDefaultGarmentImage();
const defaultCategoryImage = require('./garments/clothes-cut.png');

// Product category images using existing garments
const clothingImage = require('./garments/clothes-cut.png');
const shirtsImage = require('./garments/shirt-cut.png');
const tshirtImage = require('./garments/t-shirt.png');
const jacketImage = require('./garments/jacket.png');
const dressImage = require('./garments/dress.png');
const pantsImage = require('./garments/pants.png');
const jeansImage = require('./garments/jeans.png');
const shoesImage = require('./garments/shoes.png');
const accessoriesImage = require('./garments/buttons.png');
const winterImage = require('./garments/winter-coat.png');
const kidsImage = require('./garments/kids-clothes.png');
const formalImage = require('./garments/suit.png');
const casualImage = require('./garments/polo.png');
const homeImage = require('./garments/curtain.png');
const beddingImage = require('./garments/blankets.png');

// Category image mapping using existing garment assets
export const CATEGORY_IMAGES: { [key: string]: ImageSourcePropType } = {
  'clothing': clothingImage,
  'clothes': clothingImage,
  'apparel': clothingImage,
  'fashion': clothingImage,
  'garments': clothingImage,
  'shirts': shirtsImage,
  'shirt': shirtsImage,
  'blouses': shirtsImage,
  'tops': shirtsImage,
  'tshirts': tshirtImage,
  't-shirts': tshirtImage,
  'tshirt': tshirtImage,
  't-shirt': tshirtImage,
  'casual': casualImage,
  'jackets': jacketImage,
  'jacket': jacketImage,
  'coats': jacketImage,
  'outerwear': jacketImage,
  'blazers': jacketImage,
  'dresses': dressImage,
  'dress': dressImage,
  'gowns': dressImage,
  'formal': formalImage,
  'suits': formalImage,
  'suit': formalImage,
  'business': formalImage,
  'pants': pantsImage,
  'trousers': pantsImage,
  'slacks': pantsImage,
  'jeans': jeansImage,
  'denim': jeansImage,
  'shoes': shoesImage,
  'footwear': shoesImage,
  'boots': shoesImage,
  'sneakers': shoesImage,
  'accessories': accessoriesImage,
  'accessory': accessoriesImage,
  'buttons': accessoriesImage,
  'hardware': accessoriesImage,
  'winter': winterImage,
  'winter-wear': winterImage,
  'cold-weather': winterImage,
  'kids': kidsImage,
  'children': kidsImage,
  'youth': kidsImage,
  'home': homeImage,
  'home-decor': homeImage,
  'curtains': homeImage,
  'bedding': beddingImage,
  'blankets': beddingImage,
  'linens': beddingImage,
};

// Product image mapping using existing garment assets
export const PRODUCT_IMAGES: { [key: string]: ImageSourcePropType } = {
  'tshirt': tshirtImage,
  't-shirt': tshirtImage,
  'shirt': shirtsImage,
  'dress-shirt': shirtsImage,
  'polo': casualImage,
  'polo-shirt': casualImage,
  'jacket': jacketImage,
  'blazer': jacketImage,
  'leather-jacket': jacketImage,
  'winter-coat': winterImage,
  'dress': dressImage,
  'wedding-dress': dressImage,
  'suit': formalImage,
  'business-suit': formalImage,
  'pants': pantsImage,
  'trousers': pantsImage,
  'jeans': jeansImage,
  'denim-jeans': jeansImage,
  'shoes': shoesImage,
  'boots': shoesImage,
  'sneakers': shoesImage,
  'kids-clothes': kidsImage,
  'children-wear': kidsImage,
  'blanket': beddingImage,
  'comforter': beddingImage,
  'pillow': beddingImage,
  'curtain': homeImage,
  'rug': homeImage,
  'socks': shoesImage,
  'winter-hat': winterImage,
  'buttons': accessoriesImage,
  'zipper': accessoriesImage,
  'patch': accessoriesImage,
};

/**
 * Get the appropriate image for a category based on its name
 * @param categoryName The name of the category
 * @returns Image source for the category or default image
 */
export const getCategoryImage = (categoryName: string): ImageSourcePropType => {
  const normalizedName = categoryName.toLowerCase().trim();
  
  // Try exact match first
  if (CATEGORY_IMAGES[normalizedName]) {
    return CATEGORY_IMAGES[normalizedName];
  }
  
  // Try partial match
  for (const [key, image] of Object.entries(CATEGORY_IMAGES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return image;
    }
  }
  
  return defaultCategoryImage;
};

/**
 * Get the appropriate image for a product based on its name or image name
 * @param productName The name of the product
 * @param imageName Optional specific image name from the product data
 * @returns Image source for the product or default image
 */
export const getProductImage = (productName: string, imageName?: string): ImageSourcePropType => {
  // If a specific image name is provided, try to use it
  if (imageName) {
    const normalizedImageName = imageName.toLowerCase().trim();
    if (PRODUCT_IMAGES[normalizedImageName]) {
      return PRODUCT_IMAGES[normalizedImageName];
    }
  }
  
  // Fall back to product name matching
  const normalizedName = productName.toLowerCase().trim();
  
  // Try exact match first
  if (PRODUCT_IMAGES[normalizedName]) {
    return PRODUCT_IMAGES[normalizedName];
  }
  
  // Try partial match
  for (const [key, image] of Object.entries(PRODUCT_IMAGES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return image;
    }
  }
  
  return defaultProductImage;
};

/**
 * Get all available category image keys
 * @returns Array of category image keys
 */
export const getAvailableCategoryImages = (): string[] => {
  return Object.keys(CATEGORY_IMAGES);
};

/**
 * Get all available product image keys
 * @returns Array of product image keys
 */
export const getAvailableProductImages = (): string[] => {
  return Object.keys(PRODUCT_IMAGES);
};

/**
 * Check if a category has a specific image available
 * @param categoryName The category name to check
 * @returns True if a specific image exists, false otherwise
 */
export const hasCategoryImage = (categoryName: string): boolean => {
  const normalizedName = categoryName.toLowerCase().trim();
  return CATEGORY_IMAGES[normalizedName] !== undefined;
};

/**
 * Check if a product has a specific image available
 * @param productName The product name to check
 * @param imageName Optional specific image name
 * @returns True if a specific image exists, false otherwise
 */
export const hasProductImage = (productName: string, imageName?: string): boolean => {
  if (imageName) {
    const normalizedImageName = imageName.toLowerCase().trim();
    if (PRODUCT_IMAGES[normalizedImageName]) {
      return true;
    }
  }
  
  const normalizedName = productName.toLowerCase().trim();
  return PRODUCT_IMAGES[normalizedName] !== undefined;
};

/**
 * Get the default product image
 * @returns Default product image source
 */
export const getDefaultProductImage = (): ImageSourcePropType => {
  return defaultProductImage;
};

/**
 * Get the default category image
 * @returns Default category image source
 */
export const getDefaultCategoryImage = (): ImageSourcePropType => {
  return defaultCategoryImage;
};