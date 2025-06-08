import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EmployeeDocument } from '../schemas/employee';
import { employeeService } from '../services/employeeService';
import { EmployeeFormData, EmployeeValidationErrors } from '../../utils/employeeValidation';

interface EmployeeOperationResult {
  success: boolean;
  employee?: EmployeeDocument;
  errors?: EmployeeValidationErrors;
  duplicateError?: string;
}

export const useEmployees = () => {
  const [allEmployees, setAllEmployees] = useState<EmployeeDocument[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchQuery = useRef<string>('');

  // Initialize and load employees
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        await employeeService.initialize();
        const employees = await employeeService.getAllEmployees();
        setAllEmployees(employees);
        setFilteredEmployees(employees);
        
        // Subscribe to changes
        const unsubscribe = employeeService.subscribeToChanges(async () => {
          const updatedEmployees = await employeeService.getAllEmployees();
          setAllEmployees(updatedEmployees);
          
          // Re-apply search if there's an active search query
          if (currentSearchQuery.current.trim()) {
            const searchResults = await employeeService.searchEmployees(currentSearchQuery.current);
            setFilteredEmployees(searchResults);
          } else {
            setFilteredEmployees(updatedEmployees);
          }
        });

        return unsubscribe;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = loadEmployees();
    
    return () => {
      // Cleanup timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      // Cleanup subscription
      if (unsubscribe) {
        unsubscribe.then(unsub => unsub?.());
      }
    };
  }, []); // Remove searchQuery dependency to prevent re-initialization

  // Search functionality with proper debouncing
  const searchEmployees = useCallback((query: string) => {
    setSearchQuery(query);
    currentSearchQuery.current = query;
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    if (!query.trim()) {
      setFilteredEmployees(allEmployees);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await employeeService.searchEmployees(query);
        setFilteredEmployees(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search employees');
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce
  }, [allEmployees]);

  // Create employee with validation
  const createEmployee = useCallback(async (employeeData: EmployeeFormData): Promise<EmployeeOperationResult> => {
    try {
      setOperationLoading(true);
      const result = await employeeService.createEmployee(employeeData);
      
      if (result.employee) {
        return { success: true, employee: result.employee };
      } else {
        return { 
          success: false, 
          errors: result.errors,
          duplicateError: result.duplicateError 
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
      return { success: false };
    } finally {
      setOperationLoading(false);
    }
  }, []);

  // Update employee with validation
  const updateEmployee = useCallback(async (id: string, employeeData: EmployeeFormData): Promise<EmployeeOperationResult> => {
    try {
      setOperationLoading(true);
      const result = await employeeService.updateEmployee(id, employeeData);
      
      if (result.employee) {
        return { success: true, employee: result.employee };
      } else {
        return { 
          success: false, 
          errors: result.errors,
          duplicateError: result.duplicateError 
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
      return { success: false };
    } finally {
      setOperationLoading(false);
    }
  }, []);

  // Delete employee
  const deleteEmployee = useCallback(async (id: string): Promise<boolean> => {
    try {
      setOperationLoading(true);
      const success = await employeeService.deleteEmployee(id);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
      return false;
    } finally {
      setOperationLoading(false);
    }
  }, []);

  // Get employee by ID
  const getEmployeeById = useCallback(async (id: string): Promise<EmployeeDocument | null> => {
    try {
      return await employeeService.getEmployeeById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get employee');
      return null;
    }
  }, []);

  // Clear search and show all employees
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    currentSearchQuery.current = '';
    setFilteredEmployees(allEmployees);
  }, [allEmployees]);

  // Computed values
  const totalEmployees = useMemo(() => allEmployees.length, [allEmployees]);
  const hasSearchResults = useMemo(() => searchQuery.trim() !== '', [searchQuery]);
  const isSearching = useMemo(() => searchLoading, [searchLoading]);

  return {
    // Data
    employees: filteredEmployees,
    allEmployees,
    totalEmployees,
    
    // Search state
    searchQuery,
    hasSearchResults,
    isSearching,
    
    // Loading states
    loading,
    operationLoading,
    
    // Error state
    error,
    
    // Actions
    searchEmployees,
    clearSearch,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeById,
    clearError: () => setError(null),
    refreshEmployees: async () => {
      const employees = await employeeService.getAllEmployees();
      setAllEmployees(employees);
      if (!searchQuery.trim()) {
        setFilteredEmployees(employees);
      }
    }
  };
};