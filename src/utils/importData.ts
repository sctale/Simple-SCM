import * as DocumentPicker from 'expo-document-picker';
import { DeviceEventEmitter } from 'react-native';
import { File } from 'expo-file-system';
import { importBackup } from '../database/scmDB';
import { SCM_EVENTS } from '../constants';
import { EXPORT_VERSION, type ScmBackup } from './exportData';

export type ImportStrategy = 'merge' | 'replace';

export interface ImportResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

function parseBackup(text: string): { data: ScmBackup | null; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { data: null, error: 'JSON 解析失败' };
  }
  if (!parsed || typeof parsed !== 'object') return { data: null, error: 'JSON 结构无效' };
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== EXPORT_VERSION) return { data: null, error: `不支持的备份版本: ${String(obj.version)}` };

  const arr = (k: string) => (Array.isArray(obj[k]) ? (obj[k] as unknown[]) : []);
  const data: ScmBackup = {
    version: EXPORT_VERSION,
    exportedAt: String(obj.exportedAt ?? ''),
    suppliers: arr('suppliers') as ScmBackup['suppliers'],
    categories: arr('categories') as ScmBackup['categories'],
    insights: arr('insights') as ScmBackup['insights'],
    researchEntries: arr('researchEntries') as ScmBackup['researchEntries'],
    researchTemplates: arr('researchTemplates') as ScmBackup['researchTemplates'],
    aiModels: arr('aiModels') as ScmBackup['aiModels'],
    risks: arr('risks') as ScmBackup['risks'],
    actionItems: arr('actionItems') as ScmBackup['actionItems'],
    settings: (obj.settings && typeof obj.settings === 'object' ? obj.settings : {}) as Record<string, string>,
  };
  return { data };
}

export async function pickAndImportData(strategy: ImportStrategy): Promise<ImportResult> {
  let pickResult;
  try {
    pickResult = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'public.json'],
      copyToCacheDirectory: true,
    });
  } catch {
    return { success: false, error: '无法选择文件' };
  }
  if (pickResult.canceled || !pickResult.assets || pickResult.assets.length === 0) {
    return { success: false, cancelled: true };
  }
  const asset = pickResult.assets[0];
  let text: string;
  try {
    const file = new File(asset.uri);
    text = await file.text();
  } catch {
    return { success: false, error: '文件读取失败' };
  }
  const { data, error } = parseBackup(text);
  if (error || !data) return { success: false, error };
  try {
    await importBackup(data, strategy);
    DeviceEventEmitter.emit(SCM_EVENTS.DATA_IMPORTED);
    return { success: true };
  } catch {
    return { success: false, error: '数据库写入失败' };
  }
}
