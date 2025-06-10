export interface BusinessFormData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  taxId?: string;
  website?: string;
}

export interface BusinessValidationErrors {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  taxId?: string;
  website?: string;
}

export const validateBusinessForm = (data: BusinessFormData): BusinessValidationErrors => {
  const errors: BusinessValidationErrors = {};

  // Required fields
  if (!data.name?.trim()) {
    errors.name = 'Business name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Business name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Business name must be less than 100 characters';
  }

  // Required phone validation
  if (!data.phone || !data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phoneRegex.test(data.phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }
  }

  // Optional ZIP code validation
  if (data.zipCode && data.zipCode.trim()) {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(data.zipCode.trim())) {
      errors.zipCode = 'Please enter a valid ZIP code (12345 or 12345-6789)';
    }
  }

  // Optional website validation
  if (data.website && data.website.trim()) {
    try {
      new URL(data.website.trim());
    } catch {
      errors.website = 'Please enter a valid website URL';
    }
  }

  return errors;
};