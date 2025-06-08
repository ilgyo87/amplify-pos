import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { employeeService } from '../database/services/employeeService';
import { EmployeeDocument } from '../database/schemas/employee';

interface EmployeeAuthContextType {
  currentEmployee: EmployeeDocument | null;
  isSignedIn: boolean;
  signIn: (pin: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  isLoading: boolean;
}

const EmployeeAuthContext = createContext<EmployeeAuthContextType | undefined>(undefined);

interface EmployeeAuthProviderProps {
  children: ReactNode;
}

export const EmployeeAuthProvider: React.FC<EmployeeAuthProviderProps> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize employee service when context starts
    const initializeService = async () => {
      try {
        await employeeService.initialize();
      } catch (error) {
        console.error('Failed to initialize employee service:', error);
      }
    };
    
    initializeService();
  }, []);

  const signIn = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!pin || pin.length !== 4) {
      return { success: false, error: 'PIN must be 4 digits' };
    }

    setIsLoading(true);
    
    try {
      // Find employee by PIN
      const employees = await employeeService.getAllEmployees();
      
      // If no employees exist, check for admin bypass PIN
      if (employees.length === 0) {
        if (pin === '9999') {
          // Create a temporary admin user for first-time setup
          const tempAdmin = {
            id: 'temp-admin',
            firstName: 'Admin',
            lastName: 'Setup',
            email: 'admin@setup.com',
            pin: '9999',
            role: 'Administrator',
            phone: '',
            hireDate: new Date().toISOString().split('T')[0],
            isActive: true,
            isLocalOnly: true,
            isDeleted: false,
            lastSyncedAt: '',
            amplifyId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            businessId: ''
          } as any; // Cast to avoid type issues with the temp object
          
          setCurrentEmployee(tempAdmin);
          setIsLoading(false);
          console.log('Admin bypass activated - please create employees');
          return { success: true };
        } else {
          setIsLoading(false);
          return { 
            success: false, 
            error: 'No employees found. Use PIN 9999 for admin setup.' 
          };
        }
      }
      
      const employee = employees.find(emp => emp.pin === pin && !emp.isDeleted);
      
      if (!employee) {
        setIsLoading(false);
        return { success: false, error: 'Invalid PIN. Please try again.' };
      }

      // Check if employee is active
      if (!employee.isActive) {
        setIsLoading(false);
        return { success: false, error: 'Employee account is inactive. Please contact manager.' };
      }

      setCurrentEmployee(employee);
      setIsLoading(false);
      
      console.log(`Employee signed in: ${employee.firstName} ${employee.lastName}`);
      return { success: true };
      
    } catch (error) {
      console.error('Sign-in error:', error);
      setIsLoading(false);
      return { success: false, error: 'Sign-in failed. Please try again.' };
    }
  };

  const signOut = () => {
    if (currentEmployee) {
      console.log(`Employee signed out: ${currentEmployee.firstName} ${currentEmployee.lastName}`);
    }
    setCurrentEmployee(null);
  };

  const value: EmployeeAuthContextType = {
    currentEmployee,
    isSignedIn: !!currentEmployee,
    signIn,
    signOut,
    isLoading
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (context === undefined) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};