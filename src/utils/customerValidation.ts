import { validatePhoneNumber } from './phoneUtils';

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateZipCode = (zipCode: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

export const validateCustomerForm = (data: CustomerFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!data.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }

  // Email is optional, but if provided, it must be valid
  if (data.email && data.email.trim() && !validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhoneNumber(data.phone)) {
    errors.phone = 'Please enter a valid 10-digit phone number';
  }

  if (data.zipCode && data.zipCode.trim() && !validateZipCode(data.zipCode)) {
    errors.zipCode = 'Please enter a valid ZIP code (12345 or 12345-6789)';
  }

  return errors;
};

export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  field: 'email' | 'phone' | null;
  existingCustomerId?: string;
}

export const checkForDuplicates = async (
  data: CustomerFormData,
  checkDuplicateEmail: (email: string, excludeId?: string) => Promise<boolean>,
  checkDuplicatePhone: (phone: string, excludeId?: string) => Promise<boolean>,
  currentCustomerId?: string
): Promise<DuplicateCheckResult> => {
  // Only check email duplicates if email is provided
  if (data.email && data.email.trim()) {
    const emailExists = await checkDuplicateEmail(data.email, currentCustomerId);
    if (emailExists) {
      return { isDuplicate: true, field: 'email' };
    }
  }

  const phoneExists = await checkDuplicatePhone(data.phone, currentCustomerId);
  if (phoneExists) {
    return { isDuplicate: true, field: 'phone' };
  }

  return { isDuplicate: false, field: null };
};