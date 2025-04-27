export interface ModelInfoBase {
  brand: string;
  model: string;
  name?: string;
  icon?: string;
  disabled?: boolean;
  tags?: string[];
}

export interface TextModelInfo extends ModelInfoBase {
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureDefault?: number;
  topPMin?: number;
  topPMax?: number;
  topPDefault?: number;
  presencePenaltyMin?: number;
  presencePenaltyMax?: number;
  presencePenaltyDefault?: number;
  frequencyPenaltyMin?: number;
  frequencyPenaltyMax?: number;
  frequencyPenaltyDefault?: number;
  maxTokensMin?: number;
  maxTokensMax?: number;
  maxTokensDefault?: number;
}

export type ServiceMode = 'single' | 'multiple';
export type ServiceModePermissionMap = {
  ensureViewAllProjectsRoles: string[] | undefined;
  ensurePromptsEditorRoles: string[] | undefined;
  ensurePromptsAdminRoles: string[] | undefined;
};

export interface ImageModelInfo extends ModelInfoBase {
  brand: string;
  model: string;
  nMin?: number;
  nMax?: number;
  nDefault?: number;
  disabled?: boolean;
  quality?: string[];
  qualityDefault?: 'standard' | 'hd' | 'high' | 'medium' | 'low' | 'auto';
  responseFormat?: string[];
  responseFormatDefault?: 'url' | 'b64_json';
  size?: string[];
  sizeDefault?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024' | '1536x1024' | '1024x1536' | 'auto';
  style?: string[];
  styleDefault?: 'vivid' | 'natural';
  background?: ('transparent' | 'opaque' | 'auto')[];
  backgroundDefault?: 'transparent' | 'opaque' | 'auto';
  outputFormat?: ('jpeg' | 'png' | 'webp')[];
  outputFormatDefault?: 'jpeg' | 'png' | 'webp';
  moderation?: ('low' | 'auto')[];
  moderationDefault?: 'low' | 'auto';
  outputCompressionMin?: number;
  outputCompressionMax?: number;
  outputCompressionDefault?: number;
}
