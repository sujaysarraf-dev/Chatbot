
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Source {
  title: string;
  uri: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  imageData?: string;
  sources?: Source[];
  isBookmarked?: boolean;
  isLiked?: boolean;
  isLoveEffect?: boolean;
  suggestions?: string[];
  quizData?: QuizData;
  isQuizSetup?: boolean;
  suggestedTopic?: string;
  session_id?: string;
  isGeneratingImage?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
