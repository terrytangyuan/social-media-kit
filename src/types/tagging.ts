export type PersonMapping = {
  id: string;
  name: string;
  displayName: string;
  twitter?: string;
  bluesky?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaggingState = {
  personMappings: PersonMapping[];
}; 