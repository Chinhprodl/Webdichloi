
export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-pro-preview',
];

export const LANGUAGES = [
  'Tiếng Anh', 'Tiếng Việt', 'Tiếng Tây Ban Nha', 'Tiếng Pháp', 'Tiếng Đức', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung', 'Tiếng Nga', 'Tiếng Ả Rập'
];

export const PROMPT_TEMPLATES = [
  {
    title: 'Bản dịch Tiêu chuẩn',
    prompt: 'Dịch tệp phụ đề này một cách tự nhiên, giữ nguyên ý nghĩa và giọng văn gốc.',
  },
  {
    title: 'Trang trọng / Kỹ thuật',
    prompt: 'Dịch tệp phụ đề này với giọng văn trang trọng, đảm bảo các thuật ngữ kỹ thuật được dịch chính xác. Sử dụng đại từ nhân xưng trang trọng, lịch sự, phù hợp với giới tính và vai vế của nhân vật.',
  },
  {
    title: 'Hài hước / Thân mật',
    prompt: 'Dịch tệp phụ đề này với giọng văn thân mật và hài hước, điều chỉnh các câu đùa và tài liệu tham khảo văn hóa nếu phù hợp. Sử dụng đại từ nhân xưng gần gũi, thể hiện đúng mối quan hệ và giới tính của nhân vật.',
  },
];

export const QUEUE_CONFIG = {
  MAX_CONCURRENT: 4,
  RATE_LIMIT_JOBS: 4,
  RATE_LIMIT_DURATION_MS: 60000,
};
