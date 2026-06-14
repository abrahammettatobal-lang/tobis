import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTodayInTimezone } from '../utils/timezone.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BUNDLED_DATA_DIR = path.join(__dirname, '..', '..', 'data');
function useEphemeralDataDir() {
  return Boolean(process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
}

export const DATA_DIR = useEphemeralDataDir()
  ? path.join('/tmp', 'tobis-data')
  : BUNDLED_DATA_DIR;
const BUDGET_FILE = path.join(DATA_DIR, 'api-budget.json');

export const API_DAILY_LIMIT = Number(process.env.API_DAILY_LIMIT || 100);

const DEFAULT_BUDGET = {
  date: getTodayInTimezone(),
  limit: API_DAILY_LIMIT,
  usedToday: 0,
  lastApiCallAt: null,
  lastSuccessfulUpdateAt: null,
  dailyVerificationDone: false,
  finalConfirmationCalls: 0,
  allFinishedConfirmed: false,
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readBudgetFile() {
  try {
    const raw = await fs.readFile(BUDGET_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_BUDGET };
  }
}

async function writeBudgetFile(state) {
  try {
    await ensureDataDir();
    await fs.writeFile(BUDGET_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.warn('[api-budget] No se pudo escribir caché:', error.message);
  }
}

export async function resetDailyApiBudgetIfNeeded() {
  const state = await readBudgetFile();
  const today = getTodayInTimezone();

  if (state.date === today) {
    return state;
  }

  const reset = {
    ...DEFAULT_BUDGET,
    date: today,
    limit: API_DAILY_LIMIT,
  };

  await writeBudgetFile(reset);
  return reset;
}

export async function getDailyApiBudget() {
  const state = await resetDailyApiBudgetIfNeeded();
  return {
    date: state.date,
    limit: state.limit,
    usedToday: state.usedToday,
    remainingToday: Math.max(0, state.limit - state.usedToday),
    lastApiCallAt: state.lastApiCallAt,
    lastSuccessfulUpdateAt: state.lastSuccessfulUpdateAt,
    dailyVerificationDone: state.dailyVerificationDone,
    finalConfirmationCalls: state.finalConfirmationCalls,
    allFinishedConfirmed: state.allFinishedConfirmed,
  };
}

export async function incrementDailyApiUsage() {
  const state = await resetDailyApiBudgetIfNeeded();
  state.usedToday += 1;
  state.lastApiCallAt = new Date().toISOString();
  await writeBudgetFile(state);
  return getDailyApiBudget();
}

export async function markDailyVerificationDone() {
  const state = await resetDailyApiBudgetIfNeeded();
  state.dailyVerificationDone = true;
  await writeBudgetFile(state);
}

export async function markSuccessfulApiUpdate() {
  const state = await resetDailyApiBudgetIfNeeded();
  state.lastSuccessfulUpdateAt = new Date().toISOString();
  await writeBudgetFile(state);
}

export async function incrementFinalConfirmation() {
  const state = await resetDailyApiBudgetIfNeeded();
  state.finalConfirmationCalls += 1;
  if (state.finalConfirmationCalls >= 2) {
    state.allFinishedConfirmed = true;
  }
  await writeBudgetFile(state);
}

export async function resetFinishedConfirmation() {
  const state = await resetDailyApiBudgetIfNeeded();
  state.finalConfirmationCalls = 0;
  state.allFinishedConfirmed = false;
  await writeBudgetFile(state);
}
