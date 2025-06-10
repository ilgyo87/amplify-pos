import React from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import EmployeeSignInScreen from '../../screens/Auth/EmployeeSignInScreen';

interface AuthenticationWrapperProps {
  children: React.ReactNode;
}

export function AuthenticationWrapper({ children }: AuthenticationWrapperProps) {
  const { isSignedIn } = useEmployeeAuth();

  if (!isSignedIn) {
    return <EmployeeSignInScreen />;
  }

  return <>{children}</>;
}