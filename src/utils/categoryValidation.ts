export interface CategoryFormData {
  name: string;
  color: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CategoryValidationErrors {
  name?: string;
  color?: string;
  description?: string;
  displayOrder?: string;
  isActive?: string;
}

export const validateCategoryName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50;
};

export const validateColor = (color: string): boolean => {
  // Validate hex color format (#RRGGBB or #RGB)
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
};

export const validateCategoryForm = (data: CategoryFormData): CategoryValidationErrors => {
  const errors: CategoryValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Category name is required';
  } else if (!validateCategoryName(data.name)) {
    errors.name = 'Category name must be between 2 and 50 characters';
  }

  if (!data.color.trim()) {
    errors.color = 'Color is required';
  } else if (!validateColor(data.color)) {
    errors.color = 'Please enter a valid color (e.g., #FF5733)';
  }

  if (data.description && data.description.trim().length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  return errors;
};

export const hasValidationErrors = (errors: CategoryValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

export interface CategoryDuplicateCheckResult {
  isDuplicate: boolean;
  field: 'name' | null;
  existingCategoryId?: string;
}

export const checkForCategoryDuplicates = async (
  data: CategoryFormData,
  checkDuplicateName: (name: string, excludeId?: string) => Promise<boolean>,
  currentCategoryId?: string
): Promise<CategoryDuplicateCheckResult> => {
  const nameExists = await checkDuplicateName(data.name, currentCategoryId);
  if (nameExists) {
    return { isDuplicate: true, field: 'name' };
  }

  return { isDuplicate: false, field: null };
};

// Predefined color palette for categories
export const CATEGORY_COLORS = [
  '#FF5733', // Red-Orange
  '#33FF57', // Green
  '#3357FF', // Blue
  '#FF33F1', // Magenta
  '#F1FF33', // Yellow
  '#33FFF1', // Cyan
  '#FF8C33', // Orange
  '#8C33FF', // Purple
  '#33FF8C', // Light Green
  '#FF3333', // Red
  '#33B5FF', // Light Blue
  '#B533FF', // Violet
  '#FFB533', // Amber
  '#33FFB5', // Mint
  '#FF5A8C', // Pink
  '#5AFF33', // Lime
];

export const getRandomCategoryColor = (): string => {
  return CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
};