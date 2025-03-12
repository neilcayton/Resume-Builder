import React, { createContext, useContext, ReactNode } from 'react';
import useFirestore from '../hooks/useFirestore';
import { Template, Resume, UserProfile, UserSettings } from '../services/firebaseService';

// Define the context type
interface FirestoreContextType {
  // State
  loading: boolean;
  error: string | null;
  user: UserProfile | null;
  userSettings: UserSettings | null;
  
  // Template operations
  getTemplates: (category?: string, isPremium?: boolean) => Promise<Template[]>;
  getDefaultTemplates: () => Promise<Template[]>;
  getTemplateById: (templateId: string, isDefault?: boolean) => Promise<Template>;
  
  // Resume operations
  createResume: (resumeData: Partial<Resume>) => Promise<string>;
  getResumes: () => Promise<Resume[]>;
  getResumeById: (resumeId: string) => Promise<Resume>;
  updateResume: (resumeId: string, resumeData: Partial<Resume>) => Promise<void>;
  deleteResume: (resumeId: string) => Promise<void>;
  
  // Shared resume operations
  shareResume: (resumeId: string, expiresInDays?: number) => Promise<string>;
  unshareResume: (resumeId: string) => Promise<void>;
  getSharedResume: (resumeId: string) => Promise<any>;
  
  // User operations
  updateUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  updateUserSettings: (settingsData: Partial<UserSettings>) => Promise<void>;
  
  // Analytics
  logEvent: (eventType: string, data: any) => Promise<void>;
  
  // Helpers
  requireAuth: () => boolean;
}

// Create the context with a default value
const FirestoreContext = createContext<FirestoreContextType | undefined>(undefined);

// Provider component
export const FirestoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const firestoreHook = useFirestore();
  
  return (
    <FirestoreContext.Provider value={firestoreHook}>
      {children}
    </FirestoreContext.Provider>
  );
};

// Custom hook to use the firestore context
export const useFirestoreContext = () => {
  const context = useContext(FirestoreContext);
  
  if (context === undefined) {
    throw new Error('useFirestoreContext must be used within a FirestoreProvider');
  }
  
  return context;
};

export default FirestoreContext;
