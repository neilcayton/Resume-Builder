import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ResumeBuilder: React.FC = () => {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('personalInfo');

  useEffect(() => {
    const fetchResumeData = async () => {
      if (!resumeId || !auth.currentUser) return;

      try {
        const userId = auth.currentUser.uid;
        // Use the subcollection path for users/{userId}/resumes
        const resumeRef = doc(db, `users/${userId}/resumes`, resumeId);
        const resumeSnap = await getDoc(resumeRef);

        if (!resumeSnap.exists()) {
          setError('Resume not found');
          return;
        }

        setResumeData(resumeSnap.data());
      } catch (err: any) {
        console.error('Error fetching resume:', err);
        console.error('Detailed error:', {
          code: err.code,
          message: err.message,
          stack: err.stack
        });
        setError('Failed to load resume data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResumeData();
  }, [resumeId]);

  const handleSave = async () => {
    if (!resumeId || !auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;
      // Use the subcollection path for users/{userId}/resumes
      const resumeRef = doc(db, `users/${userId}/resumes`, resumeId);
      await updateDoc(resumeRef, {
        ...resumeData,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error saving resume:', err);
      console.error('Detailed error:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError('Failed to save resume. Please try again.');
    }
  };

  const handleExportPDF = () => {
    // PDF export functionality will be implemented here
    console.log('Export to PDF');
  };

  const updatePersonalInfo = (field: string, value: string) => {
    setResumeData({
      ...resumeData,
      content: {
        ...resumeData.content,
        personalInfo: {
          ...resumeData.content.personalInfo,
          [field]: value
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {resumeData.title || 'Untitled Resume'}
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left sidebar - Sections */}
        <div className="w-full md:w-64 bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Sections</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('personalInfo')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'personalInfo'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Personal Information
            </button>
            <button
              onClick={() => setActiveSection('education')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'education'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Education
            </button>
            <button
              onClick={() => setActiveSection('experience')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'experience'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Work Experience
            </button>
            <button
              onClick={() => setActiveSection('skills')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'skills'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Skills
            </button>
            <button
              onClick={() => setActiveSection('projects')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'projects'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveSection('certifications')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeSection === 'certifications'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Certifications
            </button>
          </nav>
        </div>

        {/* Middle - Form */}
        <div className="flex-1 bg-white shadow rounded-lg p-6">
          {activeSection === 'personalInfo' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={resumeData.content.personalInfo.name || ''}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={resumeData.content.personalInfo.email || ''}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={resumeData.content.personalInfo.phone || ''}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={resumeData.content.personalInfo.address || ''}
                    onChange={(e) => updatePersonalInfo('address', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    id="linkedin"
                    value={resumeData.content.personalInfo.linkedin || ''}
                    onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={resumeData.content.personalInfo.website || ''}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other sections */}
          {activeSection === 'education' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Education</h2>
              <p className="text-gray-500">Education section coming soon...</p>
            </div>
          )}
          {activeSection === 'experience' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Work Experience</h2>
              <p className="text-gray-500">Work Experience section coming soon...</p>
            </div>
          )}
          {activeSection === 'skills' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Skills</h2>
              <p className="text-gray-500">Skills section coming soon...</p>
            </div>
          )}
          {activeSection === 'projects' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Projects</h2>
              <p className="text-gray-500">Projects section coming soon...</p>
            </div>
          )}
          {activeSection === 'certifications' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Certifications</h2>
              <p className="text-gray-500">Certifications section coming soon...</p>
            </div>
          )}
        </div>

        {/* Right - Preview */}
        <div className="w-full md:w-1/3 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
          <div className="border border-gray-200 rounded-md p-4 min-h-[600px] bg-gray-50">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{resumeData.content.personalInfo.name || 'Your Name'}</h1>
              <div className="text-sm text-gray-600 mt-1">
                {resumeData.content.personalInfo.email && (
                  <span className="mr-2">{resumeData.content.personalInfo.email}</span>
                )}
                {resumeData.content.personalInfo.phone && (
                  <span>{resumeData.content.personalInfo.phone}</span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {resumeData.content.personalInfo.address && (
                  <span className="mr-2">{resumeData.content.personalInfo.address}</span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {resumeData.content.personalInfo.linkedin && (
                  <span className="mr-2">{resumeData.content.personalInfo.linkedin}</span>
                )}
                {resumeData.content.personalInfo.website && (
                  <span>{resumeData.content.personalInfo.website}</span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center mt-8">
              This is a simplified preview. The final PDF will have complete formatting based on the selected template.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
