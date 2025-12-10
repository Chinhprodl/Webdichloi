import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Job, JobStatus } from './types';
import { QUEUE_CONFIG } from './constants';
import { extractGlossary, translateSrt } from './services/geminiService';
import JobForm from './components/JobForm';
import JobList from './components/JobList';
import { Download, FileArchive, Play, AlertTriangle, PlusCircle, Trash2, X } from './components/Icons';

declare const JSZip: any;

interface GlossaryModalProps {
    job: Job;
    onSave: (jobId: string, glossary: Record<string, string>) => void;
    onClose: () => void;
}

const GlossaryModal: React.FC<GlossaryModalProps> = ({ job, onSave, onClose }) => {
    const [glossary, setGlossary] = useState<[string, string][]>([]);

    useEffect(() => {
        if (job.glossary) {
            setGlossary(Object.entries(job.glossary));
        }
    }, [job]);

    const handleKeyChange = (index: number, newKey: string) => {
        const updated = [...glossary];
        updated[index][0] = newKey;
        setGlossary(updated);
    };
    
    const handleValueChange = (index: number, newValue: string) => {
        const updated = [...glossary];
        updated[index][1] = newValue;
        setGlossary(updated);
    };

    const handleAddRow = () => {
        setGlossary([...glossary, ['', '']]);
    };

    const handleRemoveRow = (index: number) => {
        const updated = glossary.filter((_, i) => i !== index);
        setGlossary(updated);
    };

    const handleSave = () => {
        const finalGlossary = Object.fromEntries(glossary.filter(([key]) => key.trim() !== ''));
        onSave(job.id, finalGlossary);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-brand-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">Chỉnh sửa Thuật ngữ cho: {job.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-3">
                    <div className="grid grid-cols-12 gap-x-4 mb-2">
                        <div className="col-span-5"><label className="text-sm font-bold text-brand-text-muted">Thuật ngữ gốc ({job.sourceLang})</label></div>
                        <div className="col-span-5"><label className="text-sm font-bold text-brand-text-muted">Bản dịch ({job.targetLang})</label></div>
                    </div>
                    {glossary.map(([key, value], index) => (
                        <div key={index} className="grid grid-cols-12 gap-x-4 items-center">
                            <div className="col-span-5">
                                <input 
                                    type="text"
                                    value={key}
                                    onChange={(e) => handleKeyChange(index, e.target.value)}
                                    className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm sm:text-sm text-white p-2"
                                />
                            </div>
                             <div className="col-span-5">
                                <input 
                                    type="text"
                                    value={value}
                                    onChange={(e) => handleValueChange(index, e.target.value)}
                                    className="w-full bg-gray-800 border-gray-600 rounded-md shadow-sm sm:text-sm text-white p-2"
                                />
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <button onClick={() => handleRemoveRow(index)} className="p-2 text-red-500 hover:text-red-400 transition-colors" title="Xóa hàng">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                     <button onClick={handleAddRow} className="flex items-center gap-2 text-sm text-brand-primary hover:text-indigo-400 font-semibold">
                        <PlusCircle className="w-5 h-5" />
                        Thêm thuật ngữ
                    </button>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md shadow-sm hover:bg-gray-500">
                        Hủy
                    </button>
                     <button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-md shadow-sm hover:bg-indigo-500">
                        Lưu và Tiếp tục
                    </button>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState<boolean>(false);
  const [glossaryJob, setGlossaryJob] = useState<Job | null>(null);
  const processingJobs = useRef<Set<string>>(new Set());
  const jobStartTimestamps = useRef<number[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    if (!process.env.API_KEY) {
      setIsApiKeyMissing(true);
    }
  }, []);

  const addJob = (job: Omit<Job, 'id' | 'status' | 'progress' | 'glossary' | 'result' | 'error' | 'progressText'>) => {
    const newJob: Job = {
      ...job,
      id: `job_${Date.now()}_${Math.random()}`,
      status: job.detectGlossary ? JobStatus.EXTRACTING_GLOSSARY : JobStatus.IDLE,
      progress: 0,
    };
    setJobs(prev => [...prev, newJob]);
  };

  const removeJob = (id: string) => {
    if (abortControllers.current.has(id)) {
        abortControllers.current.get(id)?.abort();
        abortControllers.current.delete(id);
    }
    setJobs(prev => prev.filter(job => job.id !== id));
  };
  
  const clearJobs = () => {
    processingJobs.current.forEach(jobId => {
        abortControllers.current.get(jobId)?.abort();
    });
    setJobs([]);
    setIsProcessing(false);
  }

  const updateJob = useCallback((id: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(job => (job.id === id ? { ...job, ...updates } : job)));
  }, []);
  
  const extractAndValidateGlossary = useCallback(async (job: Job) => {
    if (processingJobs.current.has(job.id)) return;
    
    const controller = new AbortController();
    abortControllers.current.set(job.id, controller);
    processingJobs.current.add(job.id);
    
    try {
      const fileContent = await job.file.text();
      const glossary = await extractGlossary(fileContent, job, controller.signal);
      const jobToUpdate = { glossary, status: JobStatus.AWAITING_VALIDATION };
      
      setJobs(prev => {
        const updatedJobs = prev.map(j => (j.id === job.id ? { ...j, ...jobToUpdate } : j));
        const fullJob = updatedJobs.find(j => j.id === job.id);
        if (fullJob) {
          setGlossaryJob(fullJob);
        }
        return updatedJobs;
      });

    } catch (error) {
       if (error instanceof DOMException && error.name === 'AbortError') {
          updateJob(job.id, { status: JobStatus.CANCELLED, progress: 0, progressText: 'Đã hủy' });
      } else {
          const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
          updateJob(job.id, { status: JobStatus.FAILED, error: `Lỗi trích xuất thuật ngữ: ${errorMessage}`, progress: 0, progressText: undefined });
      }
    } finally {
       processingJobs.current.delete(job.id);
       abortControllers.current.delete(job.id);
    }
  }, [updateJob]);

  useEffect(() => {
    const jobsToProcess = jobs.filter(j => j.status === JobStatus.EXTRACTING_GLOSSARY && !processingJobs.current.has(j.id));
    for (const job of jobsToProcess) {
        extractAndValidateGlossary(job);
    }
  }, [jobs, extractAndValidateGlossary]);


  const handleJobReorder = (reorderedJobs: Job[]) => {
    setJobs(reorderedJobs);
  };

  const processJob = useCallback(async (job: Job) => {
    const controller = new AbortController();
    abortControllers.current.set(job.id, controller);
    processingJobs.current.add(job.id);
    updateJob(job.id, { status: JobStatus.PROCESSING, progress: 5, progressText: 'Đang chuẩn bị...' });
    
    const onProgress = (progress: number, current: number, total: number) => {
        const scaledProgress = 5 + Math.floor(progress * 0.9);
        const progressText = total > 0 ? `Đang dịch khối ${current}/${total}` : 'Đang hoàn tất...';
        updateJob(job.id, { progress: scaledProgress, progressText });
    };

    try {
        const fileContent = await job.file.text();
        const result = await translateSrt(job, fileContent, onProgress, controller.signal);
        updateJob(job.id, { status: JobStatus.COMPLETED, result, progress: 100, progressText: 'Hoàn thành' });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            updateJob(job.id, { status: JobStatus.CANCELLED, progress: 0, progressText: 'Đã hủy' });
        } else {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
            updateJob(job.id, { status: JobStatus.FAILED, error: errorMessage, progress: 0, progressText: undefined });
        }
    } finally {
        processingJobs.current.delete(job.id);
        abortControllers.current.delete(job.id);
    }
  }, [updateJob]);


  useEffect(() => {
    if (!isProcessing) return;

    const processQueue = () => {
        const now = Date.now();
        jobStartTimestamps.current = jobStartTimestamps.current.filter(
            timestamp => now - timestamp < QUEUE_CONFIG.RATE_LIMIT_DURATION_MS
        );

        const pendingJobs = jobs.filter(j => j.status === JobStatus.PENDING);
        if (pendingJobs.length === 0 && processingJobs.current.size === 0) {
            const allDone = jobs.every(j => j.status !== JobStatus.PENDING && j.status !== JobStatus.PROCESSING);
             if (allDone) {
                setIsProcessing(false);
            }
            return;
        }

        const availableSlots = QUEUE_CONFIG.MAX_CONCURRENT - processingJobs.current.size;
        const rateLimitSlots = QUEUE_CONFIG.RATE_LIMIT_JOBS - jobStartTimestamps.current.length;
        
        const slotsToFill = Math.min(availableSlots, rateLimitSlots, pendingJobs.length);

        if (slotsToFill > 0) {
            const jobsToStart = pendingJobs.slice(0, slotsToFill);
            for (const job of jobsToStart) {
                jobStartTimestamps.current.push(Date.now());
                processJob(job);
            }
        }
    }

    const intervalId = setInterval(processQueue, 1000);
    return () => clearInterval(intervalId);
  }, [isProcessing, jobs, processJob]);


  const handleStartProcessing = () => {
    if (isApiKeyMissing || jobs.length === 0 || isProcessing) return;
    setJobs(prev => prev.map(job => (job.status === JobStatus.IDLE ? { ...job, status: JobStatus.PENDING } : job)));
    setIsProcessing(true);
  };

  const handleRetryJob = (id: string) => {
    if (isApiKeyMissing) return;
    const job = jobs.find(j => j.id === id);
     if (job && (job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED)) {
        const nextStatus = job.detectGlossary ? JobStatus.EXTRACTING_GLOSSARY : JobStatus.PENDING;
        updateJob(id, { status: nextStatus, error: undefined, progress: 0, progressText: undefined });
        if (nextStatus === JobStatus.PENDING && !isProcessing) {
            setIsProcessing(true);
        }
    }
  };

  const handleCancelJob = (id: string) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    if (job.status === JobStatus.PROCESSING || job.status === JobStatus.EXTRACTING_GLOSSARY) {
        abortControllers.current.get(id)?.abort();
    } else if (job.status === JobStatus.PENDING || job.status === JobStatus.AWAITING_VALIDATION) {
        updateJob(id, { status: JobStatus.CANCELLED, progressText: 'Đã hủy' });
    }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const completedJobs = jobs.filter(j => j.status === JobStatus.COMPLETED && j.result);

    completedJobs.forEach(job => {
        const originalName = job.file.name.replace(/\.[^/.]+$/, "");
        const newFileName = `${originalName}_${job.targetLang.toLowerCase()}.srt`;
        zip.file(newFileName, job.result as string);
    });

    if (Object.keys(zip.files).length > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'phu_de_da_dich.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleOpenGlossaryEditor = (jobId: string) => {
      const jobToEdit = jobs.find(j => j.id === jobId);
      if (jobToEdit) {
          setGlossaryJob(jobToEdit);
      }
  };

  const handleSaveGlossary = (jobId: string, glossary: Record<string, string>) => {
      updateJob(jobId, { glossary, status: JobStatus.IDLE });
      setGlossaryJob(null);
  };
  
  const handleCloseGlossary = () => {
      setGlossaryJob(null);
  };

  const totalJobs = jobs.length;
  const completedJobsCount = jobs.filter(j => j.status === JobStatus.COMPLETED || j.status === JobStatus.FAILED || j.status === JobStatus.CANCELLED).length;
  const totalProgress = totalJobs > 0 ? (completedJobsCount / totalJobs) * 100 : 0;
  
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {isApiKeyMissing && (
          <div className="bg-red-900/30 border border-brand-error text-red-200 p-4 rounded-lg mb-8 flex items-center gap-4" role="alert">
            <AlertTriangle className="w-8 h-8 flex-shrink-0 text-brand-error"/>
            <div>
              <h3 className="font-bold">Lỗi Cấu Hình</h3>
              <p className="text-sm">Khóa API Gemini chưa được thiết lập. Vui lòng cấu hình biến môi trường <code>API_KEY</code> để ứng dụng hoạt động.</p>
            </div>
          </div>
        )}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Trình Dịch Phụ Đề Hàng Loạt Gemini</h1>
          <p className="mt-4 text-lg text-brand-text-muted">Tự động hóa quy trình dịch phụ đề của bạn với sức mạnh của AI.</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <JobForm onAddJob={addJob} isDisabled={isProcessing || isApiKeyMissing} />
          </div>

          <div className="lg:col-span-8">
            <div className="bg-brand-surface rounded-lg shadow-lg p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h2 className="text-2xl font-semibold text-white">Hàng đợi ({jobs.length})</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleStartProcessing}
                        disabled={isApiKeyMissing || isProcessing || !jobs.some(j => j.status === JobStatus.IDLE)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-semibold rounded-md shadow-sm hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        <Play className="w-5 h-5" />
                        {isProcessing ? 'Đang xử lý...' : 'Bắt đầu Tất cả'}
                    </button>
                    <button
                        onClick={handleDownloadAll}
                        disabled={!jobs.some(j => j.status === JobStatus.COMPLETED)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white font-semibold rounded-md shadow-sm hover:bg-purple-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        <FileArchive className="w-5 h-5" />
                        Tải xuống Tất cả
                    </button>
                    {jobs.length > 0 && <button
                        onClick={clearJobs}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Xóa tất cả
                    </button>}
                </div>
              </div>
              
              {totalJobs > 0 && (
                  <div className="mb-6">
                      <div className="flex justify-between mb-1">
                          <span className="text-base font-medium text-brand-text">Tiến độ Tổng thể</span>
                          <span className="text-sm font-medium text-brand-text">{completedJobsCount} / {totalJobs} Tệp</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="bg-gradient-to-r from-brand-primary to-brand-secondary h-2.5 rounded-full" style={{ width: `${totalProgress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                      </div>
                  </div>
              )}

              {jobs.length > 0 ? (
                <JobList jobs={jobs} onRemoveJob={removeJob} onRetryJob={handleRetryJob} onCancelJob={handleCancelJob} onJobReorder={handleJobReorder} onOpenGlossaryEditor={handleOpenGlossaryEditor} isProcessing={isProcessing} isApiKeyMissing={isApiKeyMissing} />
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-gray-600 rounded-lg">
                  <p className="text-brand-text-muted">Hàng đợi của bạn đang trống.</p>
                  <p className="text-brand-text-muted text-sm">Thêm tệp ở khung bên trái để bắt đầu.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {glossaryJob && <GlossaryModal job={glossaryJob} onSave={handleSaveGlossary} onClose={handleCloseGlossary} />}
    </div>
  );
};

export default App;
