import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AnalysisResult } from '@/contexts/AnalysisContext';
import {
  accountStorageKey,
  getActiveAccountId,
  legacyDataBelongsToAccount,
  readAccountStorageItem,
} from '@/lib/localAuth';

const LEGACY_STORAGE_KEY = 'phytopathometric_history';
const DB_NAME = 'phytopathometric';
const TABLE_NAME = 'analyses';

type SQLitePlugin = Record<string, (options: Record<string, unknown>) => Promise<any>>;

const CapacitorSQLite = registerPlugin<SQLitePlugin>('CapacitorSQLite');

let sqliteReady: Promise<boolean> | null = null;

function activeAccountId() {
  return getActiveAccountId() || 'legacy';
}

function browserStorageKey(accountId: string) {
  return accountStorageKey(LEGACY_STORAGE_KEY, accountId);
}

export function compactAnalysisForHistory(item: AnalysisResult): AnalysisResult {
  const {
    visualizacoes: _visualizations,
    ...historyItem
  } = item;
  return historyItem;
}

function reviveAnalysis(raw: unknown): AnalysisResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as AnalysisResult & { timestamp: string | Date };
  if (!item.id || !item.timestamp) return null;
  return compactAnalysisForHistory({
    ...item,
    timestamp: new Date(item.timestamp),
  });
}

function serializeAnalysis(item: AnalysisResult) {
  return JSON.stringify({
    ...compactAnalysisForHistory(item),
    timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp,
  });
}

function loadBrowserHistory(accountId = activeAccountId()): AnalysisResult[] {
  try {
    const stored = accountId === 'legacy'
      ? localStorage.getItem(LEGACY_STORAGE_KEY)
      : readAccountStorageItem(LEGACY_STORAGE_KEY, accountId);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(reviveAnalysis).filter(Boolean) as AnalysisResult[];
  } catch {
    return [];
  }
}

function saveBrowserHistory(history: AnalysisResult[], accountId = activeAccountId()) {
  const storageKey = accountId === 'legacy'
    ? LEGACY_STORAGE_KEY
    : browserStorageKey(accountId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(history.map(item => ({
      ...compactAnalysisForHistory(item),
      timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp,
    }))));
  } catch {
    const compact = history.map(({
      imageDataUrl: _image,
      processedImageDataUrl: _processed,
      visualizacoes: _visuals,
      ...rest
    }) => rest);
    try {
      localStorage.setItem(storageKey, JSON.stringify(compact));
    } catch {
      // Ignore quota errors in browser fallback.
    }
  }
}

function shouldUseNativeSQLite() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'web';
}

async function sqliteCall(method: string, options: Record<string, unknown> = {}) {
  const fn = CapacitorSQLite[method];
  if (typeof fn !== 'function') {
    throw new Error(`SQLite method unavailable: ${method}`);
  }
  return fn(options);
}

async function ensureSQLite() {
  if (!shouldUseNativeSQLite()) return false;
  if (!sqliteReady) {
    sqliteReady = (async () => {
      try {
        try {
          await sqliteCall('createConnection', {
            database: DB_NAME,
            encrypted: false,
            mode: 'no-encryption',
            version: 1,
            readonly: false,
          });
        } catch {
          // Existing connections are fine; open/execute below verifies usability.
        }

        await sqliteCall('open', { database: DB_NAME, readonly: false });
        await sqliteCall('execute', {
          database: DB_NAME,
          readonly: false,
          statements: `
            CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
              id TEXT PRIMARY KEY NOT NULL,
              account_id TEXT NOT NULL DEFAULT 'legacy',
              payload TEXT NOT NULL,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            );
          `,
        });
        const columns = await sqliteCall('query', {
          database: DB_NAME,
          readonly: false,
          statement: `PRAGMA table_info(${TABLE_NAME});`,
          values: [],
        });
        const hasAccountId = Array.isArray(columns?.values)
          && columns.values.some((column: { name?: string }) => column?.name === 'account_id');
        if (!hasAccountId) {
          await sqliteCall('execute', {
            database: DB_NAME,
            readonly: false,
            statements: `ALTER TABLE ${TABLE_NAME} ADD COLUMN account_id TEXT NOT NULL DEFAULT 'legacy';`,
          });
        }
        return true;
      } catch (error) {
        console.warn('SQLite unavailable, using browser storage fallback.', error);
        return false;
      }
    })();
  }
  return sqliteReady;
}

export async function loadAnalysisHistory(): Promise<AnalysisResult[]> {
  const accountId = activeAccountId();
  if (!(await ensureSQLite())) {
    return loadBrowserHistory(accountId);
  }

  try {
    if (accountId !== 'legacy' && legacyDataBelongsToAccount(accountId)) {
      await sqliteCall('run', {
        database: DB_NAME,
        readonly: false,
        statement: `UPDATE ${TABLE_NAME} SET account_id = ? WHERE account_id = 'legacy'`,
        values: [accountId],
      });
    }
    const history: AnalysisResult[] = [];
    for (let offset = 0; offset < 100; offset++) {
      const result = await sqliteCall('query', {
        database: DB_NAME,
        readonly: false,
        statement: `SELECT payload FROM ${TABLE_NAME} WHERE account_id = ? ORDER BY created_at DESC LIMIT 1 OFFSET ?`,
        values: [accountId, offset],
      });
      const row = Array.isArray(result?.values) ? result.values[0] : undefined;
      if (!row) break;
      const item = (() => {
        try {
          return reviveAnalysis(JSON.parse(row.payload || '{}'));
        } catch {
          return null;
        }
      })();
      if (item) history.push(item);
    }
    return history;
  } catch (error) {
    console.warn('Could not read SQLite history, using browser fallback.', error);
    return loadBrowserHistory(accountId);
  }
}

export async function saveAnalysisHistory(history: AnalysisResult[]) {
  const accountId = activeAccountId();
  if (!(await ensureSQLite())) {
    saveBrowserHistory(history, accountId);
    return;
  }

  const now = Date.now();
  try {
    await sqliteCall('execute', {
      database: DB_NAME,
      readonly: false,
      statements: `DELETE FROM ${TABLE_NAME} WHERE account_id = '${accountId.replace(/'/g, "''")}';`,
    });

    for (const item of history.slice(0, 100)) {
      const createdAt = new Date(item.timestamp).getTime() || now;
      await sqliteCall('run', {
        database: DB_NAME,
        readonly: false,
        statement: `
          INSERT OR REPLACE INTO ${TABLE_NAME} (id, account_id, payload, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        values: [item.id, accountId, serializeAnalysis(item), createdAt, now],
      });
    }
  } catch (error) {
    console.warn('Could not persist SQLite history, using browser fallback.', error);
    saveBrowserHistory(history, accountId);
  }
}

export async function clearAnalysisHistory() {
  const accountId = activeAccountId();
  if (!(await ensureSQLite())) {
    localStorage.removeItem(
      accountId === 'legacy' ? LEGACY_STORAGE_KEY : browserStorageKey(accountId),
    );
    return;
  }

  try {
    await sqliteCall('execute', {
      database: DB_NAME,
      readonly: false,
      statements: `DELETE FROM ${TABLE_NAME} WHERE account_id = '${accountId.replace(/'/g, "''")}';`,
    });
  } catch {
    localStorage.removeItem(
      accountId === 'legacy' ? LEGACY_STORAGE_KEY : browserStorageKey(accountId),
    );
  }
}
