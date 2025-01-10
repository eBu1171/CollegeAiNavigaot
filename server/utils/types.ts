export type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
