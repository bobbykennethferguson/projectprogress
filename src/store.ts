import type { AppData, Job, Milestone, TemplateMilestone, PhaseWeight } from './types.ts';
import { DEFAULT_TEMPLATE, DEFAULT_PHASE_WEIGHTS } from './defaultTemplate.ts';

const STORAGE_KEY = 'job-milestone-tracker';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch { /* ignore corrupt data */ }
  return {
    jobs: [],
    template: DEFAULT_TEMPLATE,
    phaseWeights: DEFAULT_PHASE_WEIGHTS,
    weightedMode: false,
  };
}

function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---- Public API ----

export function getData(): AppData {
  return loadData();
}

export function getJobs(): Job[] {
  return loadData().jobs;
}

export function getJob(id: string): Job | undefined {
  return loadData().jobs.find(j => j.id === id);
}

export function addJob(jobName: string, customerName: string, dueDate: string | null): Job {
  const data = loadData();
  const milestones: Milestone[] = data.template.map(t => ({
    id: generateId(),
    title: t.title,
    phase: t.phase,
    order: t.order,
    isComplete: false,
    completedAt: null,
  }));
  const now = new Date().toISOString();
  const job: Job = {
    id: generateId(),
    jobName,
    customerName,
    dueDate,
    createdAt: now,
    updatedAt: now,
    milestones,
    notes: '',
    photos: [],
  };
  data.jobs.unshift(job);
  saveData(data);
  return job;
}

export function updateJob(id: string, updates: Partial<Pick<Job, 'jobName' | 'customerName' | 'dueDate'>>): void {
  const data = loadData();
  const job = data.jobs.find(j => j.id === id);
  if (!job) return;
  if (updates.jobName !== undefined) job.jobName = updates.jobName;
  if (updates.customerName !== undefined) job.customerName = updates.customerName;
  if (updates.dueDate !== undefined) job.dueDate = updates.dueDate;
  job.updatedAt = new Date().toISOString();
  saveData(data);
}

export function deleteJob(id: string): void {
  const data = loadData();
  data.jobs = data.jobs.filter(j => j.id !== id);
  saveData(data);
}

export function saveJobNotes(id: string, notes: string): void {
  const data = loadData();
  const job = data.jobs.find(j => j.id === id);
  if (!job) return;
  job.notes = notes;
  job.updatedAt = new Date().toISOString();
  saveData(data);
}

export function saveJobPhotos(id: string, photos: string[]): void {
  const data = loadData();
  const job = data.jobs.find(j => j.id === id);
  if (!job) return;
  job.photos = photos;
  job.updatedAt = new Date().toISOString();
  saveData(data);
}

export function toggleMilestone(jobId: string, milestoneId: string): Job | undefined {
  const data = loadData();
  const job = data.jobs.find(j => j.id === jobId);
  if (!job) return undefined;
  const ms = job.milestones.find(m => m.id === milestoneId);
  if (!ms) return undefined;
  ms.isComplete = !ms.isComplete;
  ms.completedAt = ms.isComplete ? new Date().toISOString() : null;
  saveData(data);
  return job;
}

export function getTemplate(): TemplateMilestone[] {
  return loadData().template;
}

export function saveTemplate(template: TemplateMilestone[]): void {
  const data = loadData();
  data.template = template;
  saveData(data);
}

export function getPhaseWeights(): PhaseWeight[] {
  return loadData().phaseWeights;
}

export function savePhaseWeights(weights: PhaseWeight[]): void {
  const data = loadData();
  data.phaseWeights = weights;
  saveData(data);
}

export function getWeightedMode(): boolean {
  return loadData().weightedMode;
}

export function setWeightedMode(on: boolean): void {
  const data = loadData();
  data.weightedMode = on;
  saveData(data);
}

export function applyTemplateToJob(jobId: string): void {
  const data = loadData();
  const job = data.jobs.find(j => j.id === jobId);
  if (!job) return;
  const completedMap = new Map<string, { completedAt: string | null }>();
  for (const ms of job.milestones) {
    if (ms.isComplete) {
      completedMap.set(`${ms.phase}::${ms.title}`, { completedAt: ms.completedAt });
    }
  }
  job.milestones = data.template.map(t => {
    const prev = completedMap.get(`${t.phase}::${t.title}`);
    return {
      id: generateId(),
      title: t.title,
      phase: t.phase,
      order: t.order,
      isComplete: !!prev,
      completedAt: prev?.completedAt ?? null,
    };
  });
  saveData(data);
}

export function exportData(): string {
  return JSON.stringify(loadData(), null, 2);
}

export function importData(json: string): void {
  const data = JSON.parse(json) as AppData;
  if (!data.jobs || !data.template) throw new Error('Invalid data format');
  saveData(data);
}

// ---- Dark mode ----

const DARK_MODE_KEY = 'job-tracker-dark-mode';

export function getDarkMode(): boolean | null {
  const val = localStorage.getItem(DARK_MODE_KEY);
  if (val === 'true') return true;
  if (val === 'false') return false;
  return null; // no preference stored — use system
}

export function setDarkMode(on: boolean): void {
  localStorage.setItem(DARK_MODE_KEY, String(on));
}

// ---- Job list filter preferences ----

const FILTER_KEY = 'job-tracker-filters';

export interface JobFilters {
  sort: string;
  status: string;
  hasPhotos: string;
}

const DEFAULT_FILTERS: JobFilters = { sort: 'newest', status: 'all', hasPhotos: 'all' };

export function getJobFilters(): JobFilters {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (raw) return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_FILTERS;
}

export function saveJobFilters(filters: JobFilters): void {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

// ---- Progress calculation ----

export function calcProgress(job: Job, weighted: boolean, phaseWeights: PhaseWeight[]): number {
  if (job.milestones.length === 0) return 0;
  if (!weighted) {
    const done = job.milestones.filter(m => m.isComplete).length;
    return Math.round((done / job.milestones.length) * 100);
  }
  const weightMap = new Map(phaseWeights.map(pw => [pw.phase, pw.weight]));
  const phaseGroups = new Map<string, { total: number; done: number }>();
  for (const ms of job.milestones) {
    const g = phaseGroups.get(ms.phase) ?? { total: 0, done: 0 };
    g.total++;
    if (ms.isComplete) g.done++;
    phaseGroups.set(ms.phase, g);
  }
  let totalWeight = 0;
  let earned = 0;
  for (const [phase, g] of phaseGroups) {
    const w = weightMap.get(phase) ?? 0;
    totalWeight += w;
    earned += w * (g.done / g.total);
  }
  if (totalWeight === 0) return 0;
  return Math.round((earned / totalWeight) * 100);
}

export function getNextMilestone(job: Job): Milestone | null {
  const sorted = [...job.milestones].sort((a, b) => a.order - b.order);
  return sorted.find(m => !m.isComplete) ?? null;
}

export function groupByPhase(milestones: Milestone[]): Map<string, Milestone[]> {
  const map = new Map<string, Milestone[]>();
  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  for (const ms of sorted) {
    const list = map.get(ms.phase) ?? [];
    list.push(ms);
    map.set(ms.phase, list);
  }
  return map;
}
