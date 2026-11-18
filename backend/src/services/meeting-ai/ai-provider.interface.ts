export interface MeetingSummaryInput {
  meetingId: string;
  transcript: string;
  agenda?: string[];
}

export interface MeetingSummaryResult {
  summary: string;
  topics: string[];
  decisions: string[];
  actionItems: Array<{
    title: string;
    owner?: string;
    dueDate?: string;
  }>;
}

export interface ExtractionInput {
  meetingId: string;
  transcript: string;
}

export interface DecisionResult {
  text: string;
  context?: string;
  confidence?: number;
}

export interface ActionItemProposal {
  title: string;
  owner?: string;
  dueDate?: string;
}

export interface ExtractionResult {
  decisions: DecisionResult[];
  actionItems: ActionItemProposal[];
}

export interface MeetingAIProvider {
  generateSummary(input: MeetingSummaryInput): Promise<MeetingSummaryResult>;
  extractDecisions(input: ExtractionInput): Promise<DecisionResult[]>;
  extractActionItems(input: ExtractionInput): Promise<ActionItemProposal[]>;
  generateMinutes(input: {
    meetingId: string;
    transcript: string;
    agenda?: string[];
  }): Promise<{
    executiveSummary: string;
    topics: string[];
    decisions: DecisionResult[];
    actionItems: ActionItemProposal[];
  }>;
}

export interface AIProviderConfig {
  provider: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}