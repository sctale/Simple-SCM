import * as SQLite from 'expo-sqlite';
import { AI_MODEL_PRESETS, BUILTIN_RESEARCH_TEMPLATES } from '../constants';
import type {
  ActionItem, AiModel, Category, Insight, InsightTargetType, ResearchEntry,
  ResearchTemplate, ResearchType, Risk, Supplier, SupplierGrade, SupplierStatus,
} from '../types';

const DB_NAME = 'simplescm.db';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  try {
    db = await dbPromise;
    return db;
  } catch (e) {
    db = null;
    dbPromise = null;
    throw e;
  }
}

export async function initDatabase(): Promise<void> {
  const database = await getDB();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      category_id INTEGER,
      grade TEXT NOT NULL DEFAULT 'qualified',
      status TEXT NOT NULL DEFAULT 'potential',
      contact TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      kraljic_x INTEGER NOT NULL DEFAULT 1,
      kraljic_y INTEGER NOT NULL DEFAULT 1,
      strategy TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'general',
      target_id INTEGER,
      tag TEXT NOT NULL DEFAULT 'observation',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_insights_target ON insights(target_type, target_id);
    CREATE TABLE IF NOT EXISTS research_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      category_id INTEGER,
      type TEXT NOT NULL DEFAULT 'other',
      question TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      rating INTEGER,
      conclusion TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS research_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      questions TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      temperature REAL NOT NULL DEFAULT 0.7,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS risks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'general',
      target_id INTEGER,
      probability INTEGER NOT NULL DEFAULT 1,
      impact INTEGER NOT NULL DEFAULT 1,
      strategy TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      owner TEXT NOT NULL DEFAULT '',
      due_date TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 首次运行：内置调研模板
  const tplCount = await database.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM research_templates');
  if ((tplCount?.c ?? 0) === 0) {
    for (const t of BUILTIN_RESEARCH_TEMPLATES) {
      await database.runAsync(
        'INSERT INTO research_templates (name, questions, created_at) VALUES (?, ?, ?)',
        [t.name, JSON.stringify(t.questions), Date.now()]
      );
    }
  }

  // 首次运行：内置 AI 模型模板（不预置 API Key）
  const aiCount = await database.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM ai_models');
  if ((aiCount?.c ?? 0) === 0) {
    for (const m of AI_MODEL_PRESETS) {
      await database.runAsync(
        'INSERT INTO ai_models (name, base_url, model, is_builtin, temperature, created_at) VALUES (?, ?, ?, 1, 0.7, ?)',
        [m.name, m.baseUrl, m.model, Date.now()]
      );
    }
  }
}

// ===== 供应商 =====
export async function getSuppliers(): Promise<Supplier[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM suppliers ORDER BY updated_at DESC'
  );
  return rows.map(mapSupplier);
}

export async function getSupplier(id: number): Promise<Supplier | null> {
  const database = await getDB();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM suppliers WHERE id = ?', [id]
  );
  return row ? mapSupplier(row) : null;
}

export async function addSupplier(s: {
  name: string; code: string; categoryId: number | null; grade: SupplierGrade; status: SupplierStatus;
  contact: string; phone: string; email: string; note: string;
}): Promise<Supplier> {
  const database = await getDB();
  const now = Date.now();
  const result = await database.runAsync(
    `INSERT INTO suppliers (name, code, category_id, grade, status, contact, phone, email, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.name, s.code, s.categoryId, s.grade, s.status, s.contact, s.phone, s.email, s.note, now, now]
  );
  return { id: result.lastInsertRowId, ...s, createdAt: now, updatedAt: now };
}

export async function updateSupplier(id: number, s: Partial<Supplier>): Promise<void> {
  const database = await getDB();
  const cur = await getSupplier(id);
  if (!cur) return;
  const merged = { ...cur, ...s, updatedAt: Date.now() };
  await database.runAsync(
    `UPDATE suppliers SET name=?, code=?, category_id=?, grade=?, status=?, contact=?, phone=?, email=?, note=?, updated_at=?
     WHERE id=?`,
    [merged.name, merged.code, merged.categoryId, merged.grade, merged.status, merged.contact,
      merged.phone, merged.email, merged.note, merged.updatedAt, id]
  );
}

export async function deleteSupplier(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
}

function mapSupplier(r: Record<string, unknown>): Supplier {
  return {
    id: Number(r.id),
    name: String(r.name),
    code: String(r.code ?? ''),
    categoryId: r.category_id == null ? null : Number(r.category_id),
    grade: (r.grade as SupplierGrade) ?? 'qualified',
    status: (r.status as SupplierStatus) ?? 'potential',
    contact: String(r.contact ?? ''),
    phone: String(r.phone ?? ''),
    email: String(r.email ?? ''),
    note: String(r.note ?? ''),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

// ===== 品类 =====
export async function getCategories(): Promise<Category[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM categories ORDER BY parent_id IS NOT NULL, id ASC'
  );
  return rows.map(mapCategory);
}

export async function getCategory(id: number): Promise<Category | null> {
  const database = await getDB();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM categories WHERE id = ?', [id]
  );
  return row ? mapCategory(row) : null;
}

export async function addCategory(c: {
  name: string; parentId: number | null; kraljicX: number; kraljicY: number; strategy: string; note: string;
}): Promise<Category> {
  const database = await getDB();
  const result = await database.runAsync(
    `INSERT INTO categories (name, parent_id, kraljic_x, kraljic_y, strategy, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [c.name, c.parentId, c.kraljicX, c.kraljicY, c.strategy, c.note, Date.now()]
  );
  return { id: result.lastInsertRowId, ...c, createdAt: Date.now() };
}

export async function updateCategory(id: number, c: Partial<Category>): Promise<void> {
  const database = await getDB();
  const cur = await getCategory(id);
  if (!cur) return;
  const merged = { ...cur, ...c };
  await database.runAsync(
    `UPDATE categories SET name=?, parent_id=?, kraljic_x=?, kraljic_y=?, strategy=?, note=? WHERE id=?`,
    [merged.name, merged.parentId, merged.kraljicX, merged.kraljicY, merged.strategy, merged.note, id]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const database = await getDB();
  await database.withTransactionAsync(async () => {
    await database.runAsync('UPDATE suppliers SET category_id = NULL WHERE category_id = ?', [id]);
    await database.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  });
}

function mapCategory(r: Record<string, unknown>): Category {
  return {
    id: Number(r.id),
    name: String(r.name),
    parentId: r.parent_id == null ? null : Number(r.parent_id),
    kraljicX: Number(r.kraljic_x ?? 1),
    kraljicY: Number(r.kraljic_y ?? 1),
    strategy: String(r.strategy ?? ''),
    note: String(r.note ?? ''),
    createdAt: Number(r.created_at),
  };
}

// ===== 洞察 / 战略记录 =====
export async function getInsights(targetType?: InsightTargetType, targetId?: number): Promise<Insight[]> {
  const database = await getDB();
  if (targetType && targetId != null) {
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM insights WHERE target_type=? AND target_id=? ORDER BY created_at DESC',
      [targetType, targetId]
    );
    return rows.map(mapInsight);
  }
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM insights ORDER BY created_at DESC'
  );
  return rows.map(mapInsight);
}

export async function addInsight(i: {
  content: string; targetType: InsightTargetType; targetId: number | null; tag: Insight['tag'];
}): Promise<Insight> {
  const database = await getDB();
  const now = Date.now();
  const result = await database.runAsync(
    'INSERT INTO insights (content, target_type, target_id, tag, created_at) VALUES (?, ?, ?, ?, ?)',
    [i.content, i.targetType, i.targetId, i.tag, now]
  );
  return { id: result.lastInsertRowId, ...i, createdAt: now };
}

export async function deleteInsight(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM insights WHERE id = ?', [id]);
}

function mapInsight(r: Record<string, unknown>): Insight {
  return {
    id: Number(r.id),
    content: String(r.content),
    targetType: (r.target_type as InsightTargetType) ?? 'general',
    targetId: r.target_id == null ? null : Number(r.target_id),
    tag: (r.tag as Insight['tag']) ?? 'observation',
    createdAt: Number(r.created_at),
  };
}

// ===== 调研 =====
export async function getResearchEntries(supplierId?: number, categoryId?: number): Promise<ResearchEntry[]> {
  const database = await getDB();
  if (supplierId != null) {
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM research_entries WHERE supplier_id=? ORDER BY created_at DESC', [supplierId]
    );
    return rows.map(mapResearch);
  }
  if (categoryId != null) {
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM research_entries WHERE category_id=? ORDER BY created_at DESC', [categoryId]
    );
    return rows.map(mapResearch);
  }
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM research_entries ORDER BY created_at DESC'
  );
  return rows.map(mapResearch);
}

export async function addResearchEntry(e: {
  supplierId: number | null; categoryId: number | null; type: ResearchType; question: string;
  content: string; rating: number | null; conclusion: string;
}): Promise<ResearchEntry> {
  const database = await getDB();
  const now = Date.now();
  const result = await database.runAsync(
    `INSERT INTO research_entries (supplier_id, category_id, type, question, content, rating, conclusion, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [e.supplierId, e.categoryId, e.type, e.question, e.content, e.rating, e.conclusion, now]
  );
  return { id: result.lastInsertRowId, ...e, createdAt: now };
}

export async function deleteResearchEntry(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM research_entries WHERE id = ?', [id]);
}

function mapResearch(r: Record<string, unknown>): ResearchEntry {
  return {
    id: Number(r.id),
    supplierId: r.supplier_id == null ? null : Number(r.supplier_id),
    categoryId: r.category_id == null ? null : Number(r.category_id),
    type: (r.type as ResearchType) ?? 'other',
    question: String(r.question ?? ''),
    content: String(r.content ?? ''),
    rating: r.rating == null ? null : Number(r.rating),
    conclusion: String(r.conclusion ?? ''),
    createdAt: Number(r.created_at),
  };
}

// ===== 调研模板 =====
export async function getResearchTemplates(): Promise<ResearchTemplate[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM research_templates ORDER BY id ASC'
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    questions: String(r.questions),
    createdAt: Number(r.created_at),
  }));
}

export async function addResearchTemplate(name: string, questions: string[]): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    'INSERT INTO research_templates (name, questions, created_at) VALUES (?, ?, ?)',
    [name, JSON.stringify(questions), Date.now()]
  );
}

export async function deleteResearchTemplate(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM research_templates WHERE id = ?', [id]);
}

// ===== AI 模型 =====
export async function getAiModels(): Promise<AiModel[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM ai_models ORDER BY id ASC'
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    baseUrl: String(r.base_url),
    model: String(r.model),
    isBuiltin: Number(r.is_builtin ?? 0) === 1,
    temperature: Number(r.temperature ?? 0.7),
    createdAt: Number(r.created_at),
  }));
}

export async function getAiModel(id: number): Promise<AiModel | null> {
  const database = await getDB();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM ai_models WHERE id = ?', [id]
  );
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    baseUrl: String(row.base_url),
    model: String(row.model),
    isBuiltin: Number(row.is_builtin ?? 0) === 1,
    temperature: Number(row.temperature ?? 0.7),
    createdAt: Number(row.created_at),
  };
}

export async function addAiModel(m: {
  name: string; baseUrl: string; model: string; isBuiltin: boolean; temperature: number;
}): Promise<AiModel> {
  const database = await getDB();
  const result = await database.runAsync(
    'INSERT INTO ai_models (name, base_url, model, is_builtin, temperature, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [m.name, m.baseUrl, m.model, m.isBuiltin ? 1 : 0, m.temperature, Date.now()]
  );
  return { id: result.lastInsertRowId, ...m, createdAt: Date.now() };
}

export async function updateAiModel(id: number, m: Partial<AiModel>): Promise<void> {
  const database = await getDB();
  const cur = await getAiModel(id);
  if (!cur) return;
  const merged = { ...cur, ...m };
  await database.runAsync(
    'UPDATE ai_models SET name=?, base_url=?, model=?, temperature=? WHERE id=?',
    [merged.name, merged.baseUrl, merged.model, merged.temperature, id]
  );
}

export async function deleteAiModel(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM ai_models WHERE id = ?', [id]);
}

// ===== 风险 =====
export async function getRisks(): Promise<Risk[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM risks ORDER BY created_at DESC'
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    targetType: (r.target_type as InsightTargetType) ?? 'general',
    targetId: r.target_id == null ? null : Number(r.target_id),
    probability: Number(r.probability ?? 1),
    impact: Number(r.impact ?? 1),
    strategy: String(r.strategy ?? ''),
    status: (r.status as Risk['status']) ?? 'open',
    createdAt: Number(r.created_at),
  }));
}

export async function addRisk(r: {
  title: string; targetType: InsightTargetType; targetId: number | null; probability: number;
  impact: number; strategy: string;
}): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    'INSERT INTO risks (title, target_type, target_id, probability, impact, strategy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [r.title, r.targetType, r.targetId, r.probability, r.impact, r.strategy, 'open', Date.now()]
  );
}

export async function updateRiskStatus(id: number, status: Risk['status']): Promise<void> {
  const database = await getDB();
  await database.runAsync('UPDATE risks SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteRisk(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM risks WHERE id = ?', [id]);
}

// ===== 行动项 =====
export async function getActionItems(): Promise<ActionItem[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM action_items ORDER BY done ASC, due_date IS NULL, due_date ASC, created_at DESC'
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    owner: String(r.owner ?? ''),
    dueDate: r.due_date == null ? null : String(r.due_date),
    done: Number(r.done ?? 0) === 1,
    createdAt: Number(r.created_at),
  }));
}

export async function addActionItem(a: { title: string; owner: string; dueDate: string | null }): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    'INSERT INTO action_items (title, owner, due_date, done, created_at) VALUES (?, ?, ?, 0, ?)',
    [a.title, a.owner, a.dueDate, Date.now()]
  );
}

export async function toggleActionItem(id: number, done: boolean): Promise<void> {
  const database = await getDB();
  await database.runAsync('UPDATE action_items SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}

export async function deleteActionItem(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM action_items WHERE id = ?', [id]);
}

// ===== 设置 =====
export async function getSetting(key: string): Promise<string | null> {
  const database = await getDB();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', [key]
  );
  return row?.value ?? null;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const database = await getDB();
  const rows = await database.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

// ===== 数据导入（备份恢复）=====
export interface BackupData {
  suppliers: Supplier[];
  categories: Category[];
  insights: Insight[];
  researchEntries: ResearchEntry[];
  researchTemplates: ResearchTemplate[];
  aiModels: AiModel[];
  risks: Risk[];
  actionItems: ActionItem[];
  settings: Record<string, string>;
}

export async function importBackup(data: BackupData, mode: 'replace' | 'merge'): Promise<void> {
  const database = await getDB();
  await database.withTransactionAsync(async () => {
    if (mode === 'replace') {
      await database.execAsync(`
        DELETE FROM action_items;
        DELETE FROM risks;
        DELETE FROM research_entries;
        DELETE FROM insights;
        DELETE FROM suppliers;
        DELETE FROM categories;
        DELETE FROM ai_models;
        DELETE FROM research_templates;
      `);
      // 内置模板随备份恢复（备份同时含内置与自定义模板）
    }

    for (const s of data.suppliers) {
      if (mode === 'replace') {
        await database.runAsync(
          `INSERT INTO suppliers (id, name, code, category_id, grade, status, contact, phone, email, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.name, s.code, s.categoryId, s.grade, s.status, s.contact, s.phone, s.email, s.note, s.createdAt, s.updatedAt]
        );
      } else {
        await database.runAsync(
          `INSERT INTO suppliers (name, code, category_id, grade, status, contact, phone, email, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.name, s.code, s.categoryId, s.grade, s.status, s.contact, s.phone, s.email, s.note, s.createdAt, s.updatedAt]
        );
      }
    }

    for (const c of data.categories) {
      if (mode === 'replace') {
        await database.runAsync(
          `INSERT INTO categories (id, name, parent_id, kraljic_x, kraljic_y, strategy, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, c.parentId, c.kraljicX, c.kraljicY, c.strategy, c.note, c.createdAt]
        );
      } else {
        await database.runAsync(
          `INSERT INTO categories (name, parent_id, kraljic_x, kraljic_y, strategy, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [c.name, c.parentId, c.kraljicX, c.kraljicY, c.strategy, c.note, c.createdAt]
        );
      }
    }

    for (const i of data.insights) {
      await database.runAsync(
        'INSERT INTO insights (content, target_type, target_id, tag, created_at) VALUES (?, ?, ?, ?, ?)',
        [i.content, i.targetType, i.targetId, i.tag, i.createdAt]
      );
    }
    for (const e of data.researchEntries) {
      await database.runAsync(
        'INSERT INTO research_entries (supplier_id, category_id, type, question, content, rating, conclusion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [e.supplierId, e.categoryId, e.type, e.question, e.content, e.rating, e.conclusion, e.createdAt]
      );
    }
    for (const r of data.risks) {
      await database.runAsync(
        'INSERT INTO risks (title, target_type, target_id, probability, impact, strategy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [r.title, r.targetType, r.targetId, r.probability, r.impact, r.strategy, r.status, r.createdAt]
      );
    }
    for (const a of data.actionItems) {
      await database.runAsync(
        'INSERT INTO action_items (title, owner, due_date, done, created_at) VALUES (?, ?, ?, ?, ?)',
        [a.title, a.owner, a.dueDate, a.done ? 1 : 0, a.createdAt]
      );
    }
    for (const m of data.aiModels) {
      if (mode === 'replace') {
        await database.runAsync(
          'INSERT INTO ai_models (id, name, base_url, model, is_builtin, temperature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [m.id, m.name, m.baseUrl, m.model, m.isBuiltin ? 1 : 0, m.temperature, m.createdAt]
        );
      } else {
        await database.runAsync(
          'INSERT INTO ai_models (name, base_url, model, is_builtin, temperature, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [m.name, m.baseUrl, m.model, m.isBuiltin ? 1 : 0, m.temperature, m.createdAt]
        );
      }
    }
    for (const [k, v] of Object.entries(data.settings)) {
      await database.runAsync(
        `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [k, v]
      );
    }

    // 调研模板：（替换）按备份重建；（合并）仅补齐不重复的模板
    for (const t of data.researchTemplates) {
      if (mode === 'replace') {
        await database.runAsync(
          'INSERT INTO research_templates (id, name, questions, created_at) VALUES (?, ?, ?, ?)',
          [t.id, t.name, t.questions, t.createdAt]
        );
      } else {
        const exists = await database.getFirstAsync<{ c: number }>(
          'SELECT COUNT(*) as c FROM research_templates WHERE name = ?', [t.name]
        );
        if ((exists?.c ?? 0) === 0) {
          await database.runAsync(
            'INSERT INTO research_templates (name, questions, created_at) VALUES (?, ?, ?)',
            [t.name, t.questions, t.createdAt]
          );
        }
      }
    }
  });
}
