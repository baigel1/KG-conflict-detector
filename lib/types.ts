export interface YextEntity {
  id?: string;
  name?: string;
  description?: string;
  content?: string;
  answer?: string;
  mainPhone?: string;
  websiteUrl?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  meta?: {
    id?: string;
    entityType?: string;
    accountId?: string;
    uid?: string;
    timestamp?: string;
    createdTimestamp?: string;
    folderId?: string;
    language?: string;
    countryCode?: string;
  };
}

export interface ConflictDetail {
  field: string;
  values: Array<{
    entityId: string | undefined;
    entityName: string | undefined;
    value: string;
  }>;
  conflictType: string;
  severity: "high" | "medium" | "low";
  description: string;
}

export interface ConflictGroup {
  id: string;
  title: string;
  entities: Array<{
    id: string | undefined;
    name: string | undefined;
    type?: string;
  }>;
  conflictDetails: ConflictDetail[];
  severity: "high" | "medium" | "low";
}
