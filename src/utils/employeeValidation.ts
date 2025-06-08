import { validatePhoneNumber } from './phoneUtils';

export interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  pin: string;
}

export interface EmployeeValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  pin?: string;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateZipCode = (zipCode: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

export const validatePin = (pin: string): boolean => {
  // PIN should be 4-6 digits
  const pinRegex = /^\d{4,6}$/;
  return pinRegex.test(pin);
};

export const validateEmployeeForm = (data: EmployeeFormData): EmployeeValidationErrors => {
  const errors: EmployeeValidationErrors = {};

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

  // PIN is required for employees
  if (!data.pin || !data.pin.trim()) {
    errors.pin = 'PIN is required';
  } else if (!validatePin(data.pin)) {
    errors.pin = 'PIN must be 4-6 digits';
  }

  return errors;
};

export const hasValidationErrors = (errors: EmployeeValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

export interface EmployeeDuplicateCheckResult {
  isDuplicate: boolean;
  field: 'email' | 'phone' | 'pin' | null;
  existingEmployeeId?: string;
}

export const checkForEmployeeDuplicates = async (
  data: EmployeeFormData,
  checkDuplicateEmail: (email: string, excludeId?: string) => Promise<boolean>,
  checkDuplicatePhone: (phone: string, excludeId?: string) => Promise<boolean>,
  checkDuplicatePin: (pin: string, excludeId?: string) => Promise<boolean>,
  currentEmployeeId?: string
): Promise<EmployeeDuplicateCheckResult> => {
  // Only check email duplicates if email is provided
  if (data.email && data.email.trim()) {
    const emailExists = await checkDuplicateEmail(data.email, currentEmployeeId);
    if (emailExists) {
      return { isDuplicate: true, field: 'email' };
    }
  }

  const phoneExists = await checkDuplicatePhone(data.phone, currentEmployeeId);
  if (phoneExists) {
    return { isDuplicate: true, field: 'phone' };
  }

  // PIN is now required, so always check for duplicates
  const pinExists = await checkDuplicatePin(data.pin, currentEmployeeId);
  if (pinExists) {
    return { isDuplicate: true, field: 'pin' };
  }

  return { isDuplicate: false, field: null };
};