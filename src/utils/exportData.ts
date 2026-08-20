import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  getActionItems, getAiModels, getCategories, getInsights, getResearchEntries,
  getResearchTemplates, getRisks, getSuppliers, getAllSettings,
} from '../database/scmDB';
import type {
  ActionItem, AiModel, Category, Insight, ResearchEntry, ResearchTemplate, Risk, Supplier,
} from '../types';

export const EXPORT_VERSION = 1;

export interface ScmBackup {
  version: number;
  exportedAt: string;
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

export async function exportAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    const [
      suppliers, categories, insights, researchEntries, researchTemplates,
      aiModels, risks, actionItems, settings,
    ] = await Promise.all([
      getSuppliers(), getCategories(), getInsights(), getResearchEntries(),
      getResearchTemplates(), getAiModels(), getRisks(), getActionItems(), getAllSettings(),
    ]);

    const backup: ScmBackup = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      suppliers, categories, insights, researchEntries, researchTemplates,
      aiModels, risks, actionItems, settings,
    };

    const fileName = `simplescm_backup_${getDateStr()}.json`;
    const file = new File(Paths.cache, fileName);
    file.create({ intermediates: true, overwrite: true });
    file.write(JSON.stringify(backup, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: '导出数据',
        UTI: 'public.json',
      });
      return { success: true };
    }
    return { success: false, error: '当前设备不支持分享' };
  } catch (e) {
    return { success: false, error: '导出失败，请重试' };
  }
}

function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}
