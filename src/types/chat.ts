export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  id: string;
  choices: {
    message: Message;
    finish_reason: string;
    index: number;
  }[];
  created: number;
  model: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ChatError {
  error: string;
  message: string;
}
