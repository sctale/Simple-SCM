import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { DeviceEventEmitter } from 'react-native';
import { parseCsv } from './csv';
import { addCategory, addSupplier, getCategories, getSuppliers, runInTransaction } from '../database/scmDB';
import { SCM_EVENTS } from '../constants';
import type { SupplierGrade, SupplierStatus } from '../types';

export interface CsvImportResult {
  success: boolean;
  total?: number;
  imported?: number;
  skipped?: number;
  error?: string;
  cancelled?: boolean;
}

export type CsvKind = 'supplier' | 'category';

const GRADE_MAP: Record<string, SupplierGrade> = {
  '战略': 'strategic', 'strategic': 'strategic',
  '优选': 'preferred', 'preferred': 'preferred',
  '合格': 'qualified', 'qualified': 'qualified', 'general': 'qualified',
  '观察': 'watch', 'watch': 'watch',
  '淘汰': 'eliminated', 'eliminated': 'eliminated',
};

const STATUS_MAP: Record<string, SupplierStatus> = {
  '潜在': 'potential', 'potential': 'potential',
  '合作中': 'active', 'active': 'active',
  '暂停': 'paused', 'paused': 'paused',
  '淘汰': 'eliminated', 'eliminated': 'eliminated',
};

function clamp01to5(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

function findColIndexByKeyword(header: string[], keywords: string[]): number {
  return header.findIndex((h) => {
    const lc = h.toLowerCase();
    return keywords.some((k) => lc.includes(k));
  });
}

export const SUPPLIER_CSV_COLUMNS = ['名称', '编码', '品类', '分级', '状态', '联系人', '电话', '邮箱', '备注'];
export const CATEGORY_CSV_COLUMNS = ['名称', '供应风险', '采购影响', '战略', '备注'];

// 解析供应商 CSV 并入供应商
export async function importSuppliersCsv(text: string): Promise<CsvImportResult> {
  try {
    const rows = parseCsv(text);
    if (rows.length === 0) return { success: false, error: 'CSV 为空' };
    const header = rows[0];

    const iName = findColIndexByKeyword(header, ['名称', 'name']);
    if (iName < 0) return { success: false, error: '请使用「名称」等表头（如：名称,编码,品类,分级,状态,联系人,电话,邮箱,备注）' };

    const iCode = findColIndexByKeyword(header, ['编码', 'code']);
    const iCat = findColIndexByKeyword(header, ['品类', 'category']);
    const iGrade = findColIndexByKeyword(header, ['分级', 'grade']);
    const iStatus = findColIndexByKeyword(header, ['状态', 'status']);
    const iContact = findColIndexByKeyword(header, ['联系人', 'contact']);
    const iPhone = findColIndexByKeyword(header, ['电话', 'phone', 'tel']);
    const iEmail = findColIndexByKeyword(header, ['邮箱', 'email']);
    const iNote = findColIndexByKeyword(header, ['备注', 'note']);

    const existing = await getSuppliers();
    const existingNames = new Set(existing.map((s) => s.name.trim()));
    const categories = await getCategories();
    const catByName = new Map(categories.map((c) => [c.name.trim(), c.id]));

    let imported = 0;
    let skipped = 0;
    const getCell = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? '').trim() : '');

    await runInTransaction(async () => {
      for (const row of rows.slice(1)) {
        const name = getCell(row, iName);
        if (!name) { skipped++; continue; }
        if (existingNames.has(name)) { skipped++; continue; }

        // 解析品类：按名称匹配，不存在则自动创建
        let categoryId: number | null = null;
        const catName = getCell(row, iCat);
        if (catName) {
          if (catByName.has(catName)) {
            categoryId = catByName.get(catName)!;
          } else {
            const created = await addCategory({
              name: catName, parentId: null, kraljicX: 1, kraljicY: 1, strategy: '', note: '由供应商 CSV 导入自动创建',
            });
            catByName.set(catName, created.id);
            categoryId = created.id;
          }
        }

        const grade = GRADE_MAP[getCell(row, iGrade).toLowerCase()] ?? GRADE_MAP[getCell(row, iGrade)] ?? 'qualified';
        const status = STATUS_MAP[getCell(row, iStatus).toLowerCase()] ?? STATUS_MAP[getCell(row, iStatus)] ?? 'potential';

        await addSupplier({
          name,
          code: getCell(row, iCode),
          categoryId,
          grade,
          status,
          contact: getCell(row, iContact),
          phone: getCell(row, iPhone),
          email: getCell(row, iEmail),
          note: getCell(row, iNote),
        });
        existingNames.add(name);
        imported++;
      }
    });

    DeviceEventEmitter.emit(SCM_EVENTS.DATA_IMPORTED);
    return { success: true, total: rows.length - 1, imported, skipped };
  } catch {
    return { success: false, error: '导入失败，请检查 CSV 格式' };
  }
}

// 解析品类 CSV 并入品类
export async function importCategoriesCsv(text: string): Promise<CsvImportResult> {
  try {
    const rows = parseCsv(text);
    if (rows.length === 0) return { success: false, error: 'CSV 为空' };
    const header = rows[0];

    const iName = findColIndexByKeyword(header, ['名称', 'name']);
    if (iName < 0) return { success: false, error: '请使用「名称」等表头（如：名称,供应风险,采购影响,战略,备注）' };

    const iX = findColIndexByKeyword(header, ['供应风险', '风险']);
    const iY = findColIndexByKeyword(header, ['采购影响', '影响']);
    const iStrategy = findColIndexByKeyword(header, ['战略', 'strategy']);
    const iNote = findColIndexByKeyword(header, ['备注', 'note']);

    const existing = await getCategories();
    const existingNames = new Set(existing.map((c) => c.name.trim()));

    let imported = 0;
    let skipped = 0;
    const getCell = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? '').trim() : '');

    await runInTransaction(async () => {
      for (const row of rows.slice(1)) {
        const name = getCell(row, iName);
        if (!name) { skipped++; continue; }
        if (existingNames.has(name)) { skipped++; continue; }

        await addCategory({
          name,
          parentId: null,
          kraljicX: clamp01to5(parseFloat(getCell(row, iX))),
          kraljicY: clamp01to5(parseFloat(getCell(row, iY))),
          strategy: getCell(row, iStrategy),
          note: getCell(row, iNote),
        });
        existingNames.add(name);
        imported++;
      }
    });

    DeviceEventEmitter.emit(SCM_EVENTS.DATA_IMPORTED);
    return { success: true, total: rows.length - 1, imported, skipped };
  } catch {
    return { success: false, error: '导入失败，请检查 CSV 格式' };
  }
}

// 选择 CSV 文件并导入
export async function pickAndImportCsv(kind: CsvKind): Promise<CsvImportResult> {
  let pick;
  try {
    pick = await DocumentPicker.getDocumentAsync({
      type: ['text/comma-separated-values', 'text/csv', 'application/csv', 'text/*'],
      copyToCacheDirectory: true,
    });
  } catch {
    return { success: false, error: '无法选择文件' };
  }
  if (pick.canceled || !pick.assets || pick.assets.length === 0) {
    return { success: false, cancelled: true };
  }
  const asset = pick.assets[0];
  let text: string;
  try {
    const file = new File(asset.uri);
    text = await file.text();
  } catch {
    return { success: false, error: '文件读取失败' };
  }
  if (kind === 'supplier') return importSuppliersCsv(text);
  return importCategoriesCsv(text);
}