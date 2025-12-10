import React, { useState } from 'react';
import { Job, JobStatus } from '../types';
import { Download, Eye, RotateCw, Trash2, X, StopCircle, BookText } from './Icons';

interface JobItemProps {
  job: Job;
  onRemoveJob: (id: string) => void;
  onRetryJob: (id: string) => void;
  onCancelJob: (id: string) => void;
  onOpenGlossaryEditor: (id: string) => void;
  isProcessing: boolean;
  isApiKeyMissing: boolean;
  index: number;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  handleDragEnd: () => void;
}

const statusClasses: Record<JobStatus, { bg: string; text: string; }> = {
  [JobStatus.IDLE]: { bg: 'bg-gray-500', text: 'text-white' },
  [JobStatus.PENDING]: { bg: 'bg-brand-warning', text: 'text-black' },
  [JobStatus.EXTRACTING_GLOSSARY]: { bg: 'bg-teal-500', text: 'text-white' },
  [JobStatus.AWAITING_VALIDATION]: { bg: 'bg-purple-500', text: 'text-white' },
  [JobStatus.PROCESSING]: { bg: 'bg-blue-500', text: 'text-white' },
  [JobStatus.COMPLETED]: { bg: 'bg-brand-success', text: 'text-white' },
  [JobStatus.FAILED]: { bg: 'bg-brand-error', text: 'text-white' },
  [JobStatus.CANCELLED]: { bg: 'bg-gray-600', text: 'text-white' },
};

const PreviewModal: React.FC<{ content: string; onClose: () => void }> = ({ content, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">Xem trước</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <pre className="text-sm text-brand-text whitespace-pre-wrap">{content}</pre>
                </div>
                <div className="p-4 border-t border-gray-700">
                     <button onClick={onClose} className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-md shadow-sm hover:bg-indigo-500">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

const JobItem: React.FC<JobItemProps> = ({ job, onRemoveJob, onRetryJob, onCancelJob, onOpenGlossaryEditor, isProcessing, isApiKeyMissing, index, handleDragStart, handleDragEnter, handleDragEnd }) => {
  const { bg, text } = statusClasses[job.status];
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDownload = () => {
    if (!job.result) return;
    const blob = new Blob([job.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const originalName = job.file.name.replace(/\.[^/.]+$/, "");
    link.download = `${originalName}_${job.targetLang.toLowerCase()}.srt`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const isDraggable = !isProcessing && job.status !== JobStatus.PROCESSING && job.status !== JobStatus.PENDING;

  return (
    <>
    <div 
        className={`bg-gray-800 p-4 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:bg-gray-700/50 ${isDraggable ? 'cursor-move' : ''}`}
        draggable={isDraggable}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragEnter={(e) => handleDragEnter(e, index)}
        onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex-1 mb-3 sm:mb-0 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-lg text-white truncate" title={job.name}>{job.name}</p>
            {/* FIX: Wrapped icon in a span to apply the title attribute, resolving a TypeScript error. */}
            {job.detectGlossary && <span title="Đồng bộ thuật ngữ đang bật"><BookText className="w-4 h-4 text-brand-secondary flex-shrink-0" /></span>}
          </div>
          <p className="text-sm text-brand-text-muted truncate" title={job.file.name}>{job.file.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${bg} ${text}`}>{job.status}</span>
          <div className="flex items-center gap-1">
            {job.status === JobStatus.AWAITING_VALIDATION && (
              <button onClick={() => onOpenGlossaryEditor(job.id)} className="p-2 text-brand-secondary hover:text-purple-400 transition-colors" title="Chỉnh sửa thuật ngữ"><BookText className="w-5 h-5"/></button>
            )}
            {job.status === JobStatus.COMPLETED && (
              <>
                <button onClick={() => setIsPreviewOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors" title="Xem trước"><Eye className="w-5 h-5"/></button>
                <button onClick={handleDownload} className="p-2 text-gray-400 hover:text-white transition-colors" title="Tải xuống"><Download className="w-5 h-5"/></button>
              </>
            )}
            {(job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED) && (
              <button onClick={() => onRetryJob(job.id)} disabled={isApiKeyMissing} className="p-2 text-brand-warning hover:text-yellow-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors" title="Thử lại"><RotateCw className="w-5 h-5"/></button>
            )}
            {(job.status === JobStatus.PROCESSING || job.status === JobStatus.EXTRACTING_GLOSSARY) && (
              <button onClick={() => onCancelJob(job.id)} className="p-2 text-yellow-500 hover:text-yellow-400 transition-colors" title="Hủy"><StopCircle className="w-5 h-5"/></button>
            )}
            {(job.status === JobStatus.IDLE || job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED) && (
              <button onClick={() => onRemoveJob(job.id)} disabled={isProcessing && job.status === JobStatus.IDLE} className="p-2 text-red-500 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors" title="Xóa"><Trash2 className="w-5 h-5"/></button>
            )}
          </div>
        </div>
      </div>
      {(job.status === JobStatus.EXTRACTING_GLOSSARY) && (
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-1.5 rounded-full animate-pulse w-full"></div>
          </div>
           <p className="text-xs text-center text-brand-text-muted mt-1">{job.status}...</p>
        </div>
      )}
      {(job.status === JobStatus.PROCESSING) && (
        <div className="mt-3">
          <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-brand-text-muted">{job.progressText || ''}</span>
              <span className="text-xs font-medium text-brand-text-muted">{Math.round(job.progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className="bg-gradient-to-r from-brand-primary to-brand-secondary h-1.5 rounded-full" style={{ width: `${job.progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
          </div>
        </div>
      )}
      {job.status === JobStatus.COMPLETED && (
        <div className="mt-3">
          <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-brand-text-muted">Hoàn thành</span>
              <span className="text-xs font-medium text-brand-text-muted">100%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div className="bg-brand-success h-1.5 rounded-full" style={{ width: `100%` }}></div>
          </div>
        </div>
      )}
      {job.status === JobStatus.FAILED && job.error && (
        <p className="mt-2 text-xs text-brand-error bg-red-900/20 p-2 rounded-md truncate" title={job.error}>Lỗi: {job.error}</p>
      )}
    </div>
    {isPreviewOpen && job.result && <PreviewModal content={job.result} onClose={() => setIsPreviewOpen(false)} />}
    </>
  );
};

export default JobItem;