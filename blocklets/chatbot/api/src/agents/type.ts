export interface ChatbotResponse {
  $text: string;
  usedMemory?: string;
  allMemory?: string;
  relatedDocuments?: { id: string; url: string; title?: string; content?: string }[];
  status?: { loading?: boolean; message?: string };
}
