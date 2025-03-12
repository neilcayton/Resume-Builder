import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import * as firebaseService from '../services/firebaseService';
import { Template, Resume, UserProfile, UserSettings } from '../services/firebaseService';

export const useFirestore = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const navigate = useNavigate();

  // Authentication state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        try {
          // Create or update user profile on login
          await firebaseService.createUserProfile(firebaseUser);
          
          // Get user profile data
          const profileData = await firebaseService.getUserProfile();
          setUser(profileData);
          
          // Get user settings
          const settings = await firebaseService.getUserSettings();
          setUserSettings(settings);
        } catch (err: any) {
          console.error('Error loading user data:', err);
          setError(err.message || 'Failed to load user data');
        }
      } else {
        // User is signed out
        setUser(null);
        setUserSettings(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Template operations
  const getTemplates = async (category?: string, isPremium?: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      const templates = await firebaseService.getTemplates(category, isPremium);
      setLoading(false);
      return templates;
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
      setLoading(false);
      return [];
    }
  };

  const getDefaultTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const templates = await firebaseService.getDefaultTemplates();
      setLoading(false);
      return templates;
    } catch (err: any) {
      setError(err.message || 'Failed to load default templates');
      setLoading(false);
      return [];
    }
  };

  const getTemplateById = async (templateId: string, isDefault = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const template = await firebaseService.getTemplateById(templateId, isDefault);
      setLoading(false);
      return template;
    } catch (err: any) {
      setError(err.message || 'Failed to load template');
      setLoading(false);
      throw err;
    }
  };

  // Resume operations
  const createResume = async (resumeData: Partial<Resume>) => {
    setLoading(true);
    setError(null);
    
    try {
      const resumeId = await firebaseService.createResume(resumeData);
      setLoading(false);
      return resumeId;
    } catch (err: any) {
      setError(err.message || 'Failed to create resume');
      setLoading(false);
      throw err;
    }
  };

  const getResumes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const resumes = await firebaseService.getResumes();
      setLoading(false);
      return resumes;
    } catch (err: any) {
      setError(err.message || 'Failed to load resumes');
      setLoading(false);
      return [];
    }
  };

  const getResumeById = async (resumeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const resume = await firebaseService.getResumeById(resumeId);
      setLoading(false);
      return resume;
    } catch (err: any) {
      setError(err.message || 'Failed to load resume');
      setLoading(false);
      throw err;
    }
  };

  const updateResume = async (resumeId: string, resumeData: Partial<Resume>) => {
    setLoading(true);
    setError(null);
    
    try {
      await firebaseService.updateResume(resumeId, resumeData);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update resume');
      setLoading(false);
      throw err;
    }
  };

  const deleteResume = async (resumeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await firebaseService.deleteResume(resumeId);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete resume');
      setLoading(false);
      throw err;
    }
  };

  // Shared resume operations
  const shareResume = async (resumeId: string, expiresInDays?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const shareUrl = await firebaseService.shareResume(resumeId, expiresInDays);
      setLoading(false);
      return shareUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to share resume');
      setLoading(false);
      throw err;
    }
  };

  const unshareResume = async (resumeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await firebaseService.unshareResume(resumeId);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to unshare resume');
      setLoading(false);
      throw err;
    }
  };

  const getSharedResume = async (resumeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const sharedResume = await firebaseService.getSharedResume(resumeId);
      setLoading(false);
      return sharedResume;
    } catch (err: any) {
      setError(err.message || 'Failed to load shared resume');
      setLoading(false);
      throw err;
    }
  };

  // User profile and settings operations
  const updateUserProfile = async (profileData: Partial<UserProfile>) => {
    setLoading(true);
    setError(null);
    
    try {
      await firebaseService.updateUserProfile(profileData);
      
      // Refresh user profile
      const updatedProfile = await firebaseService.getUserProfile();
      setUser(updatedProfile);
      
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setLoading(false);
      throw err;
    }
  };

  const updateUserSettings = async (settingsData: Partial<UserSettings>) => {
    setLoading(true);
    setError(null);
    
    try {
      await firebaseService.updateUserSettings(settingsData);
      
      // Refresh user settings
      const updatedSettings = await firebaseService.getUserSettings();
      setUserSettings(updatedSettings);
      
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
      setLoading(false);
      throw err;
    }
  };

  // Analytics logging
  const logEvent = async (eventType: string, data: any) => {
    try {
      await firebaseService.logAnalyticsEvent(eventType, data);
    } catch (err) {
      console.error('Error logging analytics event:', err);
      // Don't set loading or error state for analytics
    }
  };

  // Helper to check if user is authenticated
  const requireAuth = () => {
    if (!loading && !user) {
      navigate('/login');
      return false;
    }
    return true;
  };

  return {
    // State
    loading,
    error,
    user,
    userSettings,
    
    // Template operations
    getTemplates,
    getDefaultTemplates,
    getTemplateById,
    
    // Resume operations
    createResume,
    getResumes,
    getResumeById,
    updateResume,
    deleteResume,
    
    // Shared resume operations
    shareResume,
    unshareResume,
    getSharedResume,
    
    // User operations
    updateUserProfile,
    updateUserSettings,
    
    // Analytics
    logEvent,
    
    // Helpers
    requireAuth,
  };
};

export default useFirestore;
