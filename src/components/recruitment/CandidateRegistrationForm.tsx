import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Plus, Trash2, Send, Briefcase, GraduationCap, User, Phone, Mail, MapPin, Globe } from 'lucide-react';

interface JobPosting {
  id: string;
  job_title: string;
  department?: string;
  employment_type: string;
}

interface CandidateRegistrationFormProps {
  jobPostingId?: string;
  companyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Education {
  degree: string;
  field: string;
  institution: string;
  graduation_year: number;
  grade?: string;
}

interface WorkExperience {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
}

export function CandidateRegistrationForm({
  jobPostingId,
  companyId,
  onSuccess,
  onCancel
}: CandidateRegistrationFormProps) {
  const [loading, setLoading] = useState(false);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
    date_of_birth: '',
    gender: '',
    current_location: '',
    linkedin_url: '',
    portfolio_url: '',
    years_of_experience: 0,
    current_company: '',
    current_position: '',
    current_salary: '',
    expected_salary: '',
    notice_period: '',
    skills: '',
    languages: '',
    cover_letter: '',
    source: 'direct_application',
    selected_job_posting: jobPostingId || ''
  });

  const [education, setEducation] = useState<Education[]>([{
    degree: '',
    field: '',
    institution: '',
    graduation_year: new Date().getFullYear(),
    grade: ''
  }]);

  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([{
    company: '',
    position: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  }]);

  useEffect(() => {
    if (!jobPostingId) {
      fetchJobPostings();
    }
  }, [jobPostingId]);

  const fetchJobPostings = async () => {
    const { data } = await supabase
      .from('job_postings')
      .select('id, job_title, department, employment_type')
      .eq('company_id', companyId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (data) setJobPostings(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEducationChange = (index: number, field: keyof Education, value: string | number) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const addEducation = () => {
    setEducation([...education, {
      degree: '',
      field: '',
      institution: '',
      graduation_year: new Date().getFullYear(),
      grade: ''
    }]);
  };

  const removeEducation = (index: number) => {
    if (education.length > 1) {
      setEducation(education.filter((_, i) => i !== index));
    }
  };

  const handleWorkExperienceChange = (index: number, field: keyof WorkExperience, value: string | boolean) => {
    const updated = [...workExperience];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'is_current' && value === true) {
      updated[index].end_date = '';
    }
    setWorkExperience(updated);
  };

  const addWorkExperience = () => {
    setWorkExperience([...workExperience, {
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: ''
    }]);
  };

  const removeWorkExperience = (index: number) => {
    if (workExperience.length > 1) {
      setWorkExperience(workExperience.filter((_, i) => i !== index));
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.type === 'application/msword' ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setResumeFile(file);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: 'Please upload a PDF or Word document' });
      }
    }
  };

  const uploadResume = async (candidateId: string): Promise<string | null> => {
    if (!resumeFile) return null;

    const fileExt = resumeFile.name.split('.').pop();
    const fileName = `${candidateId}-${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, resumeFile);

    if (uploadError) {
      console.error('Resume upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.selected_job_posting) {
      setMessage({ type: 'error', text: 'Please select a position to apply for' });
      return;
    }

    if (!resumeFile) {
      setMessage({ type: 'error', text: 'Please upload your resume' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      const languagesArray = formData.languages.split(',').map(l => l.trim()).filter(Boolean);

      const validEducation = education.filter(edu => edu.degree && edu.institution);
      const validWorkExperience = workExperience.filter(exp => exp.company && exp.position);

      const candidateData = {
        company_id: companyId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        nationality: formData.nationality || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        current_location: formData.current_location || null,
        linkedin_url: formData.linkedin_url || null,
        portfolio_url: formData.portfolio_url || null,
        years_of_experience: formData.years_of_experience || 0,
        current_company: formData.current_company || null,
        current_position: formData.current_position || null,
        current_salary: formData.current_salary ? parseFloat(formData.current_salary) : null,
        expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : null,
        notice_period: formData.notice_period || null,
        skills: skillsArray,
        languages: languagesArray,
        education: validEducation.length > 0 ? validEducation : null,
        work_experience: validWorkExperience.length > 0 ? validWorkExperience : null,
        status: 'active'
      };

      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .insert([candidateData])
        .select()
        .single();

      if (candidateError) throw candidateError;

      const resumeUrl = await uploadResume(candidate.id);

      if (resumeUrl) {
        await supabase
          .from('candidates')
          .update({ resume_url: resumeUrl })
          .eq('id', candidate.id);
      }

      const applicationData = {
        job_posting_id: formData.selected_job_posting,
        candidate_id: candidate.id,
        company_id: companyId,
        status: 'new',
        current_stage: 'application_received',
        source: formData.source,
        cover_letter: formData.cover_letter || null,
        resume_url: resumeUrl,
        application_date: new Date().toISOString()
      };

      const { error: applicationError } = await supabase
        .from('applications')
        .insert([applicationData]);

      if (applicationError) throw applicationError;

      setMessage({
        type: 'success',
        text: 'Your application has been submitted successfully! We will review it and get back to you soon.'
      });

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Application error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to submit application. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for Position</h1>
          <p className="text-gray-600">Fill out the form below to submit your application</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {!jobPostingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Position <span className="text-red-500">*</span>
              </label>
              <select
                name="selected_job_posting"
                value={formData.selected_job_posting}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a position...</option>
                {jobPostings.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.job_title} - {job.employment_type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Current Location
                </label>
                <input
                  type="text"
                  name="current_location"
                  value={formData.current_location}
                  onChange={handleChange}
                  placeholder="City, Country"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Online Presence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn Profile</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio/Website</label>
                <input
                  type="url"
                  name="portfolio_url"
                  value={formData.portfolio_url}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Education
            </h2>
            {education.map((edu, index) => (
              <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">Education {index + 1}</h3>
                  {education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                      placeholder="e.g., Bachelor's, Master's"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
                    <input
                      type="text"
                      value={edu.field}
                      onChange={(e) => handleEducationChange(index, 'field', e.target.value)}
                      placeholder="e.g., Computer Science"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                    <input
                      type="number"
                      value={edu.graduation_year}
                      onChange={(e) => handleEducationChange(index, 'graduation_year', parseInt(e.target.value))}
                      min="1950"
                      max={new Date().getFullYear() + 10}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade/GPA</label>
                    <input
                      type="text"
                      value={edu.grade}
                      onChange={(e) => handleEducationChange(index, 'grade', e.target.value)}
                      placeholder="e.g., 3.8/4.0 or Excellent"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addEducation}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Another Education
            </button>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Work Experience
            </h2>
            {workExperience.map((exp, index) => (
              <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">Experience {index + 1}</h3>
                  {workExperience.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWorkExperience(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => handleWorkExperienceChange(index, 'company', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => handleWorkExperienceChange(index, 'position', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={exp.start_date}
                      onChange={(e) => handleWorkExperienceChange(index, 'start_date', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={exp.end_date}
                      onChange={(e) => handleWorkExperienceChange(index, 'end_date', e.target.value)}
                      disabled={exp.is_current}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exp.is_current}
                        onChange={(e) => handleWorkExperienceChange(index, 'is_current', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">I currently work here</span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => handleWorkExperienceChange(index, 'description', e.target.value)}
                      rows={3}
                      placeholder="Describe your responsibilities and achievements..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addWorkExperience}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Another Experience
            </button>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Employment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                <input
                  type="number"
                  name="years_of_experience"
                  value={formData.years_of_experience}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notice Period</label>
                <input
                  type="text"
                  name="notice_period"
                  value={formData.notice_period}
                  onChange={handleChange}
                  placeholder="e.g., 30 days, 2 months"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Salary (SAR)</label>
                <input
                  type="number"
                  name="current_salary"
                  value={formData.current_salary}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Salary (SAR)</label>
                <input
                  type="number"
                  name="expected_salary"
                  value={formData.expected_salary}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills & Languages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills <span className="text-sm text-gray-500">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g., JavaScript, React, Node.js"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages <span className="text-sm text-gray-500">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="languages"
                  value={formData.languages}
                  onChange={handleChange}
                  placeholder="e.g., English, Arabic"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Resume & Cover Letter
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Resume <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500 ml-2">(PDF or Word)</span>
                </label>
                <input
                  type="file"
                  onChange={handleResumeChange}
                  accept=".pdf,.doc,.docx"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {resumeFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {resumeFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter
                </label>
                <textarea
                  name="cover_letter"
                  value={formData.cover_letter}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Tell us why you're interested in this position..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How did you hear about us?
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="direct_application">Direct Application</option>
                  <option value="job_board">Job Board</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="referral">Employee Referral</option>
                  <option value="company_website">Company Website</option>
                  <option value="recruitment_agency">Recruitment Agency</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
