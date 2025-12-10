export enum JobStatus {
  IDLE = 'Sẵn sàng',
  PENDING = 'Đang chờ',
  EXTRACTING_GLOSSARY = 'Đang trích xuất thuật ngữ',
  AWAITING_VALIDATION = 'Chờ xác nhận thuật ngữ',
  PROCESSING = 'Đang xử lý',
  COMPLETED = 'Hoàn thành',
  FAILED = 'Thất bại',
  CANCELLED = 'Đã hủy',
}

export interface Job {
  id: string;
  name: string;
  file: File;
  prompt: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  status: JobStatus;
  result?: string;
  error?: string;
  progress: number;
  progressText?: string;
  detectGlossary: boolean;
  glossary?: Record<string, string>;
}
