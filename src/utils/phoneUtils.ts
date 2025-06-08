export const formatPhoneNumber = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  
  if (numericValue.length <= 3) {
    return numericValue;
  } else if (numericValue.length <= 6) {
    return `(${numericValue.slice(0, 3)}) ${numericValue.slice(3)}`;
  } else {
    return `(${numericValue.slice(0, 3)}) ${numericValue.slice(3, 6)}-${numericValue.slice(6, 10)}`;
  }
};

export const cleanPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length === 10;
};

export const isValidPhoneFormat = (phone: string): boolean => {
  const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
  return phoneRegex.test(phone);
};

export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  return phone;
};