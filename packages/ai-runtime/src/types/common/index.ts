export interface ModelInfoBase {
  brand: string;
  model: string;
  name?: string;
  disabled?: boolean;
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

export type ServiceMode = 'single-tenant' | 'multi-tenant';
export type ServiceModePermissionMap = {
  ensureViewAllProjectsRoles: string[] | undefined;
  ensurePromptsEditorRoles: string[] | undefined;
  ensurePromptsAdminRoles: string[] | undefined;
};
