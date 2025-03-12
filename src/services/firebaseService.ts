import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from 'firebase/auth';

// Types
export interface Template {
  templateId: string;
  name: string;
  description: string;
  thumbnail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  category: string;
  tags: string[];
  popularity: number;
  premium: boolean;
  structure: {
    sections: {
      id: string;
      type: string;
      label: string;
      required: boolean;
      order: number;
    }[];
    styling: {
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
      fontSize: string;
      spacing: number;
      layout: string;
    };
  };
  html: string;
  css: string;
  isDefault?: boolean;
}

export interface Resume {
  resumeId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  templateId: string;
  isPublic: boolean;
  content: {
    personalInfo: {
      name: string;
      email: string;
      phone: string;
      location: string;
      website: string;
      summary: string;
    };
    education: {
      institution: string;
      degree: string;
      fieldOfStudy: string;
      startDate: string;
      endDate: string;
      description: string;
    }[];
    experience: {
      company: string;
      position: string;
      location: string;
      startDate: string;
      endDate: string;
      current: boolean;
      description: string;
    }[];
    skills: {
      name: string;
      level: number;
    }[];
    projects: {
      name: string;
      description: string;
      url: string;
      technologies: string[];
    }[];
    certifications: {
      name: string;
      issuer: string;
      date: string;
      url: string;
    }[];
  };
  settings: {
    fontSize: string;
    fontFamily: string;
    spacing: number;
    color: string;
  };
  version: number;
  versions?: {
    versionNumber: number;
    timestamp: Timestamp;
    changes: string;
  }[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  isAdmin: boolean;
  subscription?: {
    type: string;
    startDate: Timestamp;
    endDate: Timestamp;
    features: string[];
  };
}

export interface UserSettings {
  userId: string;
  theme: string;
  language: string;
  notifications: {
    email: boolean;
    browser: boolean;
  };
  defaultTemplate: string;
  privacySettings: {
    allowDataCollection: boolean;
    shareUsageStats: boolean;
  };
  recentlyUsed: {
    templates: string[];
    resumes: string[];
  };
}

// Helper function to get current user ID
const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
};

// User Profile Operations
export const createUserProfile = async (user: User): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  
  // Check if user document already exists
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Create new user profile
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      isAdmin: false,
    });
    
    // Create default user settings
    await setDoc(doc(db, 'userSettings', user.uid), {
      userId: user.uid,
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        browser: true,
      },
      defaultTemplate: '',
      privacySettings: {
        allowDataCollection: true,
        shareUsageStats: true,
      },
      recentlyUsed: {
        templates: [],
        resumes: [],
      },
    });
  } else {
    // Update last login time
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
    });
  }
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const userId = getCurrentUserId();
  const userDoc = await getDoc(doc(db, 'users', userId));
  
  if (!userDoc.exists()) {
    throw new Error('User profile not found');
  }
  
  return userDoc.data() as UserProfile;
};

export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
  const userId = getCurrentUserId();
  await updateDoc(doc(db, 'users', userId), {
    ...profileData,
    updatedAt: serverTimestamp(),
  });
};

// User Settings Operations
export const getUserSettings = async (): Promise<UserSettings> => {
  const userId = getCurrentUserId();
  const settingsDoc = await getDoc(doc(db, 'userSettings', userId));
  
  if (!settingsDoc.exists()) {
    throw new Error('User settings not found');
  }
  
  return settingsDoc.data() as UserSettings;
};

export const updateUserSettings = async (settingsData: Partial<UserSettings>): Promise<void> => {
  const userId = getCurrentUserId();
  await updateDoc(doc(db, 'userSettings', userId), settingsData);
};

// Template Operations
export const getTemplates = async (category?: string, isPremium?: boolean): Promise<Template[]> => {
  let templatesQuery = collection(db, 'templates');
  let constraints = [];
  
  if (category) {
    constraints.push(where('category', '==', category));
  }
  
  if (isPremium !== undefined) {
    constraints.push(where('premium', '==', isPremium));
  }
  
  constraints.push(orderBy('popularity', 'desc'));
  
  const q = query(templatesQuery, ...constraints);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    templateId: doc.id,
  } as Template));
};

export const getDefaultTemplates = async (): Promise<Template[]> => {
  const querySnapshot = await getDocs(collection(db, 'defaultTemplates'));
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    templateId: doc.id,
    isDefault: true,
  } as Template));
};

export const getTemplateById = async (templateId: string, isDefault = false): Promise<Template> => {
  const collectionName = isDefault ? 'defaultTemplates' : 'templates';
  const templateDoc = await getDoc(doc(db, collectionName, templateId));
  
  if (!templateDoc.exists()) {
    throw new Error('Template not found');
  }
  
  return {
    ...templateDoc.data(),
    templateId: templateDoc.id,
    isDefault: isDefault,
  } as Template;
};

// Resume Operations
export const createResume = async (resumeData: Partial<Resume>): Promise<string> => {
  const userId = getCurrentUserId();
  
  // Ensure user document exists
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  
  if (!userDoc.exists()) {
    // Create user document if it doesn't exist
    const user = auth.currentUser;
    await setDoc(userDocRef, {
      uid: user?.uid || userId,
      email: user?.email || '',
      displayName: user?.displayName || '',
      photoURL: user?.photoURL || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  
  // Create resume in user's subcollection
  const resumesCollection = collection(db, `users/${userId}/resumes`);
  const newResumeRef = doc(resumesCollection);
  
  const newResume: Partial<Resume> = {
    title: resumeData.title || 'Untitled Resume',
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    templateId: resumeData.templateId || '',
    isPublic: false,
    content: resumeData.content || {
      personalInfo: {
        name: auth.currentUser?.displayName || '',
        email: auth.currentUser?.email || '',
        phone: '',
        location: '',
        website: '',
        summary: '',
      },
      education: [],
      experience: [],
      skills: [],
      projects: [],
      certifications: [],
    },
    settings: resumeData.settings || {
      fontSize: '12pt',
      fontFamily: 'Arial',
      spacing: 1.15,
      color: '#333333',
    },
    version: 1,
    versions: [{
      versionNumber: 1,
      timestamp: serverTimestamp() as Timestamp,
      changes: 'Initial creation',
    }],
  };
  
  await setDoc(newResumeRef, newResume);
  
  // Update recently used in user settings
  const userSettingsRef = doc(db, 'userSettings', userId);
  const userSettingsDoc = await getDoc(userSettingsRef);
  
  if (userSettingsDoc.exists()) {
    const settings = userSettingsDoc.data() as UserSettings;
    const recentResumes = settings.recentlyUsed?.resumes || [];
    const recentTemplates = settings.recentlyUsed?.templates || [];
    
    // Add to front of array and remove duplicates
    const updatedResumes = [newResumeRef.id, ...recentResumes.filter(id => id !== newResumeRef.id)].slice(0, 10);
    const updatedTemplates = resumeData.templateId 
      ? [resumeData.templateId, ...recentTemplates.filter(id => id !== resumeData.templateId)].slice(0, 5)
      : recentTemplates;
    
    await updateDoc(userSettingsRef, {
      'recentlyUsed.resumes': updatedResumes,
      'recentlyUsed.templates': updatedTemplates,
      'updatedAt': serverTimestamp()
    });
  } else {
    // Create user settings if they don't exist
    await setDoc(userSettingsRef, {
      userId: userId,
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        browser: true,
      },
      defaultTemplate: '',
      privacySettings: {
        allowDataCollection: true,
        shareUsageStats: true,
      },
      recentlyUsed: {
        resumes: [newResumeRef.id],
        templates: resumeData.templateId ? [resumeData.templateId] : []
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  
  return newResumeRef.id;
};

export const getResumes = async (): Promise<Resume[]> => {
  const userId = getCurrentUserId();
  const resumesQuery = query(
    collection(db, `users/${userId}/resumes`),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(resumesQuery);
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    resumeId: doc.id,
  } as Resume));
};

export const getResumeById = async (resumeId: string): Promise<Resume> => {
  const userId = getCurrentUserId();
  const resumeDoc = await getDoc(doc(db, `users/${userId}/resumes`, resumeId));
  
  if (!resumeDoc.exists()) {
    throw new Error('Resume not found');
  }
  
  return {
    ...resumeDoc.data(),
    resumeId: resumeDoc.id,
  } as Resume;
};

export const updateResume = async (resumeId: string, resumeData: Partial<Resume>): Promise<void> => {
  const userId = getCurrentUserId();
  const resumeRef = doc(db, `users/${userId}/resumes`, resumeId);
  const resumeDoc = await getDoc(resumeRef);
  
  if (!resumeDoc.exists()) {
    throw new Error('Resume not found');
  }
  
  const currentResume = resumeDoc.data() as Resume;
  const newVersion = (currentResume.version || 0) + 1;
  
  // Create a new version entry
  const newVersionEntry = {
    versionNumber: newVersion,
    timestamp: serverTimestamp() as Timestamp,
    changes: resumeData.versions?.[0]?.changes || 'Updated resume',
  };
  
  // Update the resume with new data and version info
  await updateDoc(resumeRef, {
    ...resumeData,
    updatedAt: serverTimestamp(),
    version: newVersion,
    versions: [...(currentResume.versions || []), newVersionEntry],
  });
  
  // Update recently used in user settings
  const userSettingsRef = doc(db, 'userSettings', userId);
  const userSettingsDoc = await getDoc(userSettingsRef);
  
  if (userSettingsDoc.exists()) {
    const settings = userSettingsDoc.data() as UserSettings;
    const recentResumes = settings.recentlyUsed?.resumes || [];
    
    // Add to front of array and remove duplicates
    const updatedResumes = [resumeId, ...recentResumes.filter(id => id !== resumeId)].slice(0, 10);
    
    await updateDoc(userSettingsRef, {
      'recentlyUsed.resumes': updatedResumes,
      'updatedAt': serverTimestamp()
    });
  }
};

export const deleteResume = async (resumeId: string): Promise<void> => {
  const userId = getCurrentUserId();
  await deleteDoc(doc(db, `users/${userId}/resumes`, resumeId));
  
  // Remove from recently used in user settings
  const userSettingsRef = doc(db, 'userSettings', userId);
  const userSettingsDoc = await getDoc(userSettingsRef);
  
  if (userSettingsDoc.exists()) {
    const settings = userSettingsDoc.data() as UserSettings;
    const recentResumes = settings.recentlyUsed?.resumes || [];
    
    // Remove from array
    const updatedResumes = recentResumes.filter(id => id !== resumeId);
    
    await updateDoc(userSettingsRef, {
      'recentlyUsed.resumes': updatedResumes,
    });
  }
};

// Shared Resume Operations
export const shareResume = async (resumeId: string, expiresInDays?: number): Promise<string> => {
  const userId = getCurrentUserId();
  const resumeRef = doc(db, `users/${userId}/resumes`, resumeId);
  const resumeDoc = await getDoc(resumeRef);
  
  if (!resumeDoc.exists()) {
    throw new Error('Resume not found');
  }
  
  const resumeData = resumeDoc.data() as Resume;
  const sharedResumeRef = doc(db, 'sharedResumes', resumeId);
  
  // Calculate expiration date if provided
  let expiresAt = null;
  if (expiresInDays) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expiresInDays);
    expiresAt = Timestamp.fromDate(expirationDate);
  }
  
  await setDoc(sharedResumeRef, {
    resumeId,
    userId,
    title: resumeData.title,
    createdAt: serverTimestamp(),
    expiresAt,
    viewCount: 0,
    publicUrl: `${window.location.origin}/shared/${resumeId}`,
    content: resumeData.content,
    templateId: resumeData.templateId,
  });
  
  // Update the original resume to mark it as public
  await updateDoc(resumeRef, {
    isPublic: true,
  });
  
  return `${window.location.origin}/shared/${resumeId}`;
};

export const unshareResume = async (resumeId: string): Promise<void> => {
  const userId = getCurrentUserId();
  
  // Delete from shared resumes
  await deleteDoc(doc(db, 'sharedResumes', resumeId));
  
  // Update the original resume to mark it as private
  await updateDoc(doc(db, `users/${userId}/resumes`, resumeId), {
    isPublic: false,
  });
};

export const getSharedResume = async (resumeId: string): Promise<any> => {
  const sharedResumeDoc = await getDoc(doc(db, 'sharedResumes', resumeId));
  
  if (!sharedResumeDoc.exists()) {
    throw new Error('Shared resume not found');
  }
  
  const sharedResumeData = sharedResumeDoc.data();
  
  // Check if resume has expired
  if (sharedResumeData.expiresAt && sharedResumeData.expiresAt.toDate() < new Date()) {
    throw new Error('This shared resume has expired');
  }
  
  // Increment view count
  await updateDoc(doc(db, 'sharedResumes', resumeId), {
    viewCount: (sharedResumeData.viewCount || 0) + 1,
  });
  
  return sharedResumeData;
};

// Analytics Operations (if needed)
export const logAnalyticsEvent = async (eventType: string, data: any): Promise<void> => {
  if (!auth.currentUser) return;
  
  await setDoc(doc(collection(db, 'analytics')), {
    userId: auth.currentUser.uid,
    timestamp: serverTimestamp(),
    eventType,
    ...data,
    device: navigator.userAgent,
    browser: getBrowserInfo(),
  });
};

const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent;
  let browserName;
  
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "Chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "Firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "Safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "Opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "Edge";
  } else {
    browserName = "Unknown";
  }
  
  return browserName;
};
