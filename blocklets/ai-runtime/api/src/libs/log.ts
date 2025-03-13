import { ExecuteBlock, Role, RunAssistantInput, RunAssistantLog } from '@blocklet/ai-runtime/types';

type ImageType = { b64Json?: string; url?: string }[];

export type MessageInput = RunAssistantInput & {
  deep: number;
  output?: string;
  logs?: Array<RunAssistantLog>;
  startTime?: number;
  endTime?: number;
  images?: ImageType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  stop?: boolean;
};

export type Message = {
  id: string;
  createdAt: string;
  role: Role;
  messages?: {
    responseAs?: ExecuteBlock['respondAs'];
    taskId: string;
    content?: string;
    images?: { url: string }[];
  }[];
  content: string;
  gitRef?: string;
  parameters?: { [key: string]: any };
  images?: ImageType;
  objects?: any[];
  done?: boolean;
  loading?: boolean;
  cancelled?: boolean;
  error?: { message: string; [key: string]: unknown };
  inputMessages?: Array<MessageInput>;
};
