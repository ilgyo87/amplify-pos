import React from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import EmployeeSignInScreen from '../../screens/Auth/EmployeeSignInScreen';

interface AuthenticationWrapperProps {
  children: React.ReactNode;
}

export const AuthenticationWrapper: React.FC<AuthenticationWrapperProps> = ({ children }) => {
  const { isSignedIn } = useEmployeeAuth();

  if (!isSignedIn) {
    return <EmployeeSignInScreen />;
  }

  return <>{children}</>;
};