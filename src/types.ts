export interface Milestone {
  id: string;
  title: string;
  phase: string;
  order: number;
  isComplete: boolean;
  completedAt: string | null;
}

export interface Job {
  id: string;
  jobName: string;
  customerName: string;
  dueDate: string | null;
  createdAt: string;
  milestones: Milestone[];
}

export interface TemplateMilestone {
  id: string;
  title: string;
  phase: string;
  order: number;
}

export interface PhaseWeight {
  phase: string;
  weight: number;
}

export interface AppData {
  jobs: Job[];
  template: TemplateMilestone[];
  phaseWeights: PhaseWeight[];
  weightedMode: boolean;
}
