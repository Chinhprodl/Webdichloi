import React, { useState, useRef } from 'react';
import { Job } from '../types';
import { GEMINI_MODELS, LANGUAGES, PROMPT_TEMPLATES } from '../constants';
import { PlusCircle } from './Icons';

interface JobFormProps {
  onAddJob: (job: Omit<Job, 'id' | 'status' | 'progress' | 'glossary' | 'result' | 'error' | 'progressText'>) => void;
  isDisabled: boolean;
}

const JobForm: React.FC<JobFormProps> = ({ onAddJob, isDisabled }) => {
  const [prompt, setPrompt] = useState(PROMPT_TEMPLATES[0].prompt);
  const [sourceLang, setSourceLang] = useState('Tiếng Anh');
  const [targetLang, setTargetLang] = useState('Tiếng Việt');
  const [model, setModel] = useState(GEMINI_MODELS[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detectGlossary, setDetectGlossary] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
        const allowedExtensions = ['.srt'];
        const validFiles = Array.from(selectedFiles).filter((file: File) => {
            const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
            return allowedExtensions.includes(fileExtension);
        });

        if (validFiles.length !== selectedFiles.length) {
            setError('Một số tệp không hợp lệ. Chỉ các tệp .srt được chấp nhận.');
        } else {
            setError(null);
        }
        setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !prompt) {
        setError("Vui lòng chọn ít nhất một tệp phụ đề và nhập yêu cầu dịch.");
        return;
    }
    setError(null);
    files.forEach(file => {
      const jobName = file.name.replace(/\.[^/.]+$/, "");
      onAddJob({ name: jobName, file, prompt, sourceLang, targetLang, model, detectGlossary });
    });

    setFiles([]);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-brand-surface rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-4 text-white">Thêm Công việc Mới</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="template" className="block text-sm font-medium text-brand-text-muted">Mẫu Yêu cầu</label>
            <select
                id="template"
                onChange={(e) => setPrompt(e.target.value)}
                defaultValue={PROMPT_TEMPLATES[0].prompt}
                className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-white p-2"
            >
                {PROMPT_TEMPLATES.map(template => (
                    <option key={template.title} value={template.prompt}>{template.title}</option>
                ))}
            </select>
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-brand-text-muted">Yêu cầu Dịch (Prompt)</label>
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-white p-2"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="sourceLang" className="block text-sm font-medium text-brand-text-muted">Ngôn ngữ nguồn</label>
                <select id="sourceLang" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-white p-2">
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="targetLang" className="block text-sm font-medium text-brand-text-muted">Ngôn ngữ đích</label>
                <select id="targetLang" value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-white p-2">
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
            </div>
        </div>

        <div>
            <label htmlFor="model" className="block text-sm font-medium text-brand-text-muted">Mô hình Gemini</label>
            <select id="model" value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-white p-2">
                {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
        </div>

        <div className="flex items-center bg-gray-800/50 p-3 rounded-md">
            <input
                id="detect-glossary"
                name="detect-glossary"
                type="checkbox"
                checked={detectGlossary}
                onChange={(e) => setDetectGlossary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-brand-primary focus:ring-brand-primary"
            />
            <label htmlFor="detect-glossary" className="ml-3 block text-sm font-medium text-brand-text">
                Tự động nhận diện & đồng bộ thuật ngữ
            </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text-muted">Tệp Phụ đề</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-400">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-brand-surface rounded-md font-medium text-brand-primary hover:text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-indigo-500">
                  <span>Tải tệp lên</span>
                  <input id="file-upload" ref={fileInputRef} name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".srt" multiple />
                </label>
                <p className="pl-1">hoặc kéo và thả</p>
              </div>
              {files.length > 0 ? <p className="text-xs text-brand-text-muted">{files.length} tệp đã chọn</p> : <p className="text-xs text-gray-500">Chỉ hỗ trợ tệp SRT. Tối đa 10MB.</p>}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-brand-error">{error}</p>}
        
        <button
          type="submit"
          disabled={files.length === 0 || isDisabled}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          <PlusCircle className="w-5 h-5"/>
          Thêm vào Hàng đợi
        </button>
      </form>
    </div>
  );
};

export default JobForm;
