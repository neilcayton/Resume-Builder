# ResumeForge

ResumeForge is a customizable and editable resume builder application that helps users create professional resumes with ease. The application offers a template library, real-time preview, and cloud storage for managing multiple resume versions.

![ResumeForge Logo](https://via.placeholder.com/1200x630?text=ResumeForge)

## 🚀 Features

- **Template Library**: Choose from a variety of professionally designed resume templates
- **Real-time Preview**: See changes to your resume in real-time as you edit
- **Cloud Storage**: Save and access your resumes from anywhere
- **Version History**: Track changes and revert to previous versions if needed
- **ATS Optimization**: Create resumes optimized for Applicant Tracking Systems
- **Multiple Export Formats**: Export your resume in PDF, DOCX, and other formats
- **User Authentication**: Secure login and registration system
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

### Frontend
- **React**: JavaScript library for building user interfaces
- **TypeScript**: Static type-checking for JavaScript
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **React Router**: Navigation and routing for React applications

### Backend & Infrastructure
- **Firebase Authentication**: User authentication and management
- **Firestore**: NoSQL cloud database for storing user data and resumes
- **Firebase Hosting**: Deployment and hosting platform

### Development Tools
- **Create React App**: React application bootstrapping
- **Craco**: Configuration layer for Create React App
- **ESLint**: JavaScript linting utility
- **Prettier**: Code formatter

## 🏗️ Architecture

ResumeForge follows a modern frontend architecture with Firebase as the backend service:

### Component Structure
```
src/
├── components/        # Reusable UI components
├── contexts/          # React context providers
│   └── FirestoreContext.tsx  # Firestore data context
├── hooks/             # Custom React hooks
│   └── useFirestore.ts  # Firestore operations hook
├── pages/             # Application pages/routes
│   ├── Dashboard.tsx  # User's resume management
│   ├── Home.tsx       # Landing page
│   ├── Login.tsx      # Authentication
│   ├── ResumeBuilder.tsx  # Resume editing interface
│   └── TemplateGallery.tsx  # Template selection
├── services/          # External service integrations
│   └── firebaseService.ts  # Firebase/Firestore operations
├── App.tsx            # Main application component
└── firebase.ts        # Firebase configuration
```

### Database Schema
The application uses Firestore with the following collections:

- **users**: User profiles and settings
- **users/{userId}/resumes**: User's resume documents
- **templates**: Resume templates
- **defaultTemplates**: System-provided templates
- **sharedResumes**: Publicly shared resumes

### Authentication Flow
1. User signs up/logs in via Firebase Authentication
2. User profile is created/retrieved from Firestore
3. Authentication state is managed through React Context

### Resume Creation Flow
1. User selects a template from the Template Gallery
2. A new resume document is created in the user's subcollection
3. User is redirected to the Resume Builder to edit the resume
4. Changes are saved in real-time to Firestore

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/neilcayton/Resume-Builder.git
cd Resume-Builder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with your Firebase configuration:
```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

4. Start the development server:
```bash
npm start
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Create React App](https://create-react-app.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/)
- [React Router](https://reactrouter.com/)
