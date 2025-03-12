# ResumeForge Firebase Database Schema

This document outlines the database structure for the ResumeForge application, including collections, documents, and field structures.

## Collections Overview

1. **users** - User profiles and account information
2. **users/{userId}/resumes** - User's private resume documents
3. **templates** - Public resume templates available to all users
4. **defaultTemplates** - System default templates
5. **sharedResumes** - Publicly shared resumes
6. **userSettings** - User preferences and settings
7. **analytics** - Usage data and analytics (optional)

## Document Structures

### Users Collection
```
users/{userId}
{
  uid: string,              // Firebase Auth UID
  email: string,            // User's email
  displayName: string,      // User's display name
  photoURL: string,         // Profile picture URL
  createdAt: timestamp,     // Account creation date
  lastLogin: timestamp,     // Last login date
  isAdmin: boolean,         // Admin status flag
  subscription: {           // Subscription details (if applicable)
    type: string,           // "free", "premium", "enterprise"
    startDate: timestamp,
    endDate: timestamp,
    features: array<string> // Enabled features
  }
}
```

### Resumes Subcollection
```
users/{userId}/resumes/{resumeId}
{
  resumeId: string,         // Unique resume ID
  title: string,            // Resume title
  createdAt: timestamp,     // Creation date
  updatedAt: timestamp,     // Last update date
  templateId: string,       // Reference to template used
  isPublic: boolean,        // Whether resume is shared publicly
  content: {                // Resume content
    personalInfo: {
      name: string,
      email: string,
      phone: string,
      location: string,
      website: string,
      summary: string
    },
    education: array<{
      institution: string,
      degree: string,
      fieldOfStudy: string,
      startDate: string,
      endDate: string,
      description: string
    }>,
    experience: array<{
      company: string,
      position: string,
      location: string,
      startDate: string,
      endDate: string,
      current: boolean,
      description: string
    }>,
    skills: array<{
      name: string,
      level: number // 1-5 rating
    }>,
    projects: array<{
      name: string,
      description: string,
      url: string,
      technologies: array<string>
    }>,
    certifications: array<{
      name: string,
      issuer: string,
      date: string,
      url: string
    }>
  },
  settings: {               // Resume-specific settings
    fontSize: string,
    fontFamily: string,
    spacing: number,
    color: string
  },
  version: number,          // Version number for tracking changes
  versions: array<{         // Version history (optional)
    versionNumber: number,
    timestamp: timestamp,
    changes: string
  }>
}
```

### Templates Collection
```
templates/{templateId}
{
  templateId: string,       // Unique template ID
  name: string,             // Template name
  description: string,      // Template description
  thumbnail: string,        // URL to template thumbnail
  createdAt: timestamp,     // Creation date
  updatedAt: timestamp,     // Last update date
  createdBy: string,        // Creator's user ID
  category: string,         // e.g., "Professional", "Creative", "Academic"
  tags: array<string>,      // Searchable tags
  popularity: number,       // Usage count
  premium: boolean,         // Whether template is premium
  structure: {              // Template structure and styling
    sections: array<{
      id: string,
      type: string,         // "personalInfo", "education", "experience", etc.
      label: string,
      required: boolean,
      order: number
    }>,
    styling: {
      primaryColor: string,
      secondaryColor: string,
      fontFamily: string,
      fontSize: string,
      spacing: number,
      layout: string        // "single-column", "two-column", etc.
    }
  },
  html: string,             // HTML template structure
  css: string               // CSS styling
}
```

### Default Templates Collection
```
defaultTemplates/{templateId}
{
  // Same structure as templates collection
  // These are system-provided templates that cannot be deleted
  isDefault: true
}
```

### Shared Resumes Collection
```
sharedResumes/{resumeId}
{
  resumeId: string,         // Original resume ID
  userId: string,           // Owner's user ID
  title: string,            // Resume title
  createdAt: timestamp,     // When shared
  expiresAt: timestamp,     // Optional expiration date
  viewCount: number,        // Number of views
  publicUrl: string,        // Public URL for sharing
  // Denormalized resume content (copy of the original)
  content: { ... },         // Same structure as in resumes subcollection
  templateId: string        // Reference to template used
}
```

### User Settings Collection
```
userSettings/{userId}
{
  userId: string,           // User ID
  theme: string,            // UI theme preference
  language: string,         // Language preference
  notifications: {          // Notification settings
    email: boolean,
    browser: boolean
  },
  defaultTemplate: string,  // Default template ID
  privacySettings: {        // Privacy preferences
    allowDataCollection: boolean,
    shareUsageStats: boolean
  },
  recentlyUsed: {           // Recently used items
    templates: array<string>,
    resumes: array<string>
  }
}
```

### Analytics Collection (Optional)
```
analytics/{docId}
{
  userId: string,           // User ID
  timestamp: timestamp,     // Event timestamp
  eventType: string,        // e.g., "create_resume", "edit_resume", "export_pdf"
  resumeId: string,         // Related resume (if applicable)
  templateId: string,       // Related template (if applicable)
  sessionDuration: number,  // Session length in seconds
  device: string,           // User device info
  browser: string           // User browser info
}
```

## Implementation Notes

1. **Indexes**: Create composite indexes for:
   - `users/{userId}/resumes` collection on `updatedAt` (descending) for showing recently edited resumes
   - `templates` collection on `category` and `popularity` for filtered template browsing
   - `sharedResumes` collection on `userId` and `createdAt` for listing user's shared resumes

2. **Data Validation**: Implement validation in your application code before writing to Firestore.

3. **Denormalization**: Some data is intentionally denormalized (duplicated) for performance, such as:
   - Resume content in the `sharedResumes` collection
   - Template information in the `resumes` documents

4. **Batch Operations**: Use batch writes when updating related documents to maintain consistency.

5. **Security Rules**: Refer to `firestore.rules` for the security rules implementation.
