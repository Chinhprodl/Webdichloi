import React from 'react';
import { Job } from '../types';
import JobItem from './JobItem';

interface JobListProps {
  jobs: Job[];
  onRemoveJob: (id: string) => void;
  onRetryJob: (id: string) => void;
  onCancelJob: (id: string) => void;
  onJobReorder: (jobs: Job[]) => void;
  onOpenGlossaryEditor: (id: string) => void;
  isProcessing: boolean;
  isApiKeyMissing: boolean;
}

const JobList: React.FC<JobListProps> = ({ jobs, onRemoveJob, onRetryJob, onCancelJob, onJobReorder, onOpenGlossaryEditor, isProcessing, isApiKeyMissing }) => {
  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reorderedJobs = [...jobs];
    const draggedItemContent = reorderedJobs.splice(dragItem.current, 1)[0];
    reorderedJobs.splice(dragOverItem.current, 0, draggedItemContent);
    
    onJobReorder(reorderedJobs);

    dragItem.current = null;
    dragOverItem.current = null;
  };


  return (
    <div className="space-y-3" onDragOver={(e) => e.preventDefault()}>
      {jobs.map((job, index) => (
        <JobItem 
            key={job.id} 
            job={job} 
            onRemoveJob={onRemoveJob} 
            onRetryJob={onRetryJob} 
            onCancelJob={onCancelJob}
            onOpenGlossaryEditor={onOpenGlossaryEditor}
            isProcessing={isProcessing} 
            isApiKeyMissing={isApiKeyMissing}
            index={index}
            handleDragStart={handleDragStart}
            handleDragEnter={handleDragEnter}
            handleDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
};

export default JobList;
