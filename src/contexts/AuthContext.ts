
import { createContext } from 'react';
import { AuthContextType } from '@/types/authTypes';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
