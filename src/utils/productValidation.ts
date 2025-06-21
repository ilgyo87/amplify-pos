export interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageName?: string;
  imageUrl?: string;
  discount?: number;
  additionalPrice?: number;
  notes?: string;
}

export interface ProductValidationErrors {
  name?: string;
  description?: string;
  price?: string;
  categoryId?: string;
  imageName?: string;
  discount?: string;
  additionalPrice?: string;
  notes?: string;
}

export const validateProductName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const validatePrice = (price: number): boolean => {
  return !isNaN(price) && price >= 0 && price <= 999999.99;
};

export const validateDiscount = (discount: number): boolean => {
  return !isNaN(discount) && discount >= 0 && discount <= 100;
};

export const validateAdditionalPrice = (additionalPrice: number): boolean => {
  return !isNaN(additionalPrice) && additionalPrice >= 0 && additionalPrice <= 999999.99;
};

export const validateProductForm = (data: ProductFormData): ProductValidationErrors => {
  const errors: ProductValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Product name is required';
  } else if (!validateProductName(data.name)) {
    errors.name = 'Product name must be between 2 and 100 characters';
  }

  if (!validatePrice(data.price)) {
    errors.price = 'Please enter a valid price (0 - 999,999.99)';
  }

  if (!data.categoryId || !data.categoryId.trim()) {
    errors.categoryId = 'Category is required';
  }

  if (data.description && data.description.trim().length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  if (data.discount !== undefined && data.discount !== null && !validateDiscount(data.discount)) {
    errors.discount = 'Discount must be between 0 and 100 percent';
  }

  if (data.additionalPrice !== undefined && data.additionalPrice !== null && !validateAdditionalPrice(data.additionalPrice)) {
    errors.additionalPrice = 'Additional price must be a valid amount (0 - 999,999.99)';
  }

  if (data.notes && data.notes.trim().length > 1000) {
    errors.notes = 'Notes must be less than 1000 characters';
  }

  return errors;
};

export const hasValidationErrors = (errors: ProductValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

export interface ProductDuplicateCheckResult {
  isDuplicate: boolean;
  field: 'name' | null;
  existingProductId?: string;
}

export const checkForProductDuplicates = async (
  data: ProductFormData,
  checkDuplicateName: (name: string, categoryId: string, excludeId?: string) => Promise<boolean>,
  currentProductId?: string
): Promise<ProductDuplicateCheckResult> => {
  const nameExists = await checkDuplicateName(data.name, data.categoryId, currentProductId);
  if (nameExists) {
    return { isDuplicate: true, field: 'name' };
  }

  return { isDuplicate: false, field: null };
};

// Price formatting utilities
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export const calculateFinalPrice = (basePrice: number, discount?: number, additionalPrice?: number): number => {
  let finalPrice = basePrice;
  
  // Apply discount
  if (discount && discount > 0) {
    finalPrice = finalPrice * (1 - discount / 100);
  }
  
  // Add additional price
  if (additionalPrice && additionalPrice > 0) {
    finalPrice += additionalPrice;
  }
  
  return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
};

export const formatPriceWithDiscount = (basePrice: number, discount?: number, additionalPrice?: number): {
  originalPrice: string;
  finalPrice: string;
  savings?: string;
  hasDiscount: boolean;
} => {
  const original = basePrice + (additionalPrice || 0);
  const final = calculateFinalPrice(basePrice, discount, additionalPrice);
  const hasDiscount = discount && discount > 0;
  
  return {
    originalPrice: formatPrice(original),
    finalPrice: formatPrice(final),
    savings: hasDiscount ? formatPrice(original - final) : undefined,
    hasDiscount: !!hasDiscount
  };
};

// Product image utilities
export const DEFAULT_PRODUCT_IMAGES = [
  'shirt',
  'pants',
  'dress',
  'suit',
  'jacket',
  'blouse',
  'skirt',
  'coat',
  'tie',
  'scarf',
  'sweater',
  'jeans',
  'uniform',
  'bedding',
  'curtains',
  'default'
];

export const getDefaultImageName = (): string => {
  return 'default';
};

export const isValidImageName = (imageName: string): boolean => {
  return DEFAULT_PRODUCT_IMAGES.includes(imageName);
};