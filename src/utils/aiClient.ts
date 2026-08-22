import * as SecureStore from 'expo-secure-store';
import { getAiModel } from '../database/scmDB';
import type { AiMessage } from '../types';

// API Key 存 SecureStore（key = ai_key_<modelId>）
const keyPrefix = 'scm_ai_key_';

export async function saveModelKey(modelId: number, apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(`${keyPrefix}${modelId}`, apiKey);
}

export async function getModelKey(modelId: number): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(`${keyPrefix}${modelId}`);
  } catch {
    return null;
  }
}

export async function deleteModelKey(modelId: number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`${keyPrefix}${modelId}`);
  } catch {
    // 静默
  }
}

export async function hasModelKey(modelId: number): Promise<boolean> {
  return (await getModelKey(modelId)) != null;
}

// 调用 OpenAI 兼容接口（非流式）
export async function chatCompletion(
  modelId: number,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; timeoutMs?: number; signal?: AbortSignal }
): Promise<string> {
  const model = await getAiModel(modelId);
  if (!model) throw new Error('模型配置不存在');

  const apiKey = await getModelKey(modelId);
  // Ollama 本地通常不需要 key，允许空
  const url = `${model.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options?.timeoutMs ?? 60000);
  // 外部 signal 只做转发，fetch 始终用内部 controller.signal，保证内部超时仍然生效
  const externalSignal = options?.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort);
  }

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.model,
        messages,
        temperature: options?.temperature ?? model.temperature ?? 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`请求失败 (${resp.status})${text ? `：${text.slice(0, 120)}` : ''}`);
    }

    let data: any;
    try {
      data = await resp.json();
    } catch {
      throw new Error('响应格式错误');
    }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('模型返回内容为空');
    }
    return content.trim();
  } catch (e) {
    if (timedOut) throw new Error('请求超时');
    throw e;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

// SCM 专家系统提示词
export const SCM_SYSTEM_PROMPT =
  '你是一位资深的供应链管理专家，精通 CPSM（供应管理专业认证）和 PMP（项目管理专业认证）知识体系。' +
  '你擅长供应商评估、品类战略、采购策略、风险管理。回答专业、结构化、可落地，使用中文。';

// 便捷封装：发送完整对话（带系统提示）
export async function askModel(modelId: number, messages: AiMessage[]): Promise<string> {
  return chatCompletion(modelId, [
    { role: 'system', content: SCM_SYSTEM_PROMPT },
    ...messages,
  ]);
}
