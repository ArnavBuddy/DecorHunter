// Adapter types for all lead discovery sources

export interface RawLead {
  company_name: string;
  website?: string;
  domain?: string;
  city?: string;
  state?: string;
  source: string;
  category?: string;
}

export interface SearchParams {
  keywords: string;
  cities: string[];
  states: string[];
}

export interface LeadSource {
  name: string;
  search(params: SearchParams): Promise<RawLead[]>;
}

export interface RawContact {
  name?: string;
  title?: string;
  email: string;
  confidence?: number;
  source: string;
}
