// ========================================
// LessonLink AI Provider Abstraction
// Multi-provider support: MiniMax, Claude, DeepSeek, Kimi
// Failover: if primary fails, tries next in chain
// ========================================

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  failoverAttempts?: number;
}

export interface ProviderConfig {
  provider: 'minimax' | 'claude' | 'deepseek' | 'kimi';
  model: string;
  endpoint: string;
  apiKeyEnvVar: string;
  maxTokens: number;
  temperature: number;
}

// ========================================
// Provider Configurations
// ========================================

export const PROVIDERS: Record<string, ProviderConfig> = {
  minimax: {
    provider: 'minimax',
    model: 'MiniMax-M2.5',
    endpoint: 'https://api.minimax.io/v1/text/chatcompletion_v2',
    apiKeyEnvVar: 'MINIMAX_API_KEY',
    maxTokens: 4096,
    temperature: 0.3,
  },
  claude: {
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    maxTokens: 4096,
    temperature: 0.3,
  },
  deepseek: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    maxTokens: 4096,
    temperature: 0.3,
  },
  kimi: {
    provider: 'kimi',
    model: 'kimi-2.5',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    apiKeyEnvVar: 'KIMI_API_KEY',
    maxTokens: 4096,
    temperature: 0.3,
  },
};

// ========================================
// Task-to-Provider Failover Chains
// Each task has an ordered list: try first, then fallback
// Only providers with a valid API key in env will be attempted
// ========================================

export const TASK_FAILOVER: Record<string, string[]> = {
  assessment_analysis: ['deepseek', 'minimax', 'claude'],
  parent_report: ['deepseek', 'minimax', 'claude'],
  translation: ['deepseek', 'minimax', 'kimi'],
  session_feedback: ['deepseek', 'minimax', 'claude'],
};

// Legacy mapping (kept for reference, failover chains take priority)
export const TASK_PROVIDERS: Record<string, string> = {
  assessment_analysis: 'deepseek',
  parent_report: 'deepseek',
  translation: 'deepseek',
  session_feedback: 'deepseek',
};

// ========================================
// Provider Call Functions
// ========================================

async function callMinimax(config: ProviderConfig, messages: AiMessage[]): Promise<AiResponse> {
  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) throw new Error(`Missing env var: ${config.apiKeyEnvVar}`);

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.role === 'system' ? { name: 'MiniMax AI' } : {}),
      })),
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('MiniMax returned empty response');
  }

  return {
    content: choice.message.content,
    provider: config.provider,
    model: config.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

async function callClaude(config: ProviderConfig, messages: AiMessage[]): Promise<AiResponse> {
  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) throw new Error(`Missing env var: ${config.apiKeyEnvVar}`);

  const systemMessage = messages.find((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      ...(systemMessage ? { system: systemMessage.content } : {}),
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: any) => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error('Claude returned empty response');
  }

  return {
    content: textBlock.text,
    provider: config.provider,
    model: config.model,
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    } : undefined,
  };
}

async function callOpenAiCompatible(config: ProviderConfig, messages: AiMessage[]): Promise<AiResponse> {
  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) throw new Error(`Missing env var: ${config.apiKeyEnvVar}`);

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.provider} API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error(`${config.provider} returned empty response`);
  }

  return {
    content: choice.message.content,
    provider: config.provider,
    model: config.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

// ========================================
// Single Provider Call (used by failover)
// ========================================

function callSingleProvider(config: ProviderConfig, messages: AiMessage[]): Promise<AiResponse> {
  switch (config.provider) {
    case 'minimax':
      return callMinimax(config, messages);
    case 'claude':
      return callClaude(config, messages);
    case 'deepseek':
    case 'kimi':
      return callOpenAiCompatible(config, messages);
    default:
      throw new Error(`No handler for provider: ${config.provider}`);
  }
}

// ========================================
// Main Entry Point (with failover)
// ========================================

export async function callAiProvider(
  taskOrProvider: string,
  messages: AiMessage[]
): Promise<AiResponse> {
  // Get the failover chain for this task
  const chain = TASK_FAILOVER[taskOrProvider];

  if (chain) {
    // Filter to providers that have an API key set
    const availableChain = chain.filter((p) => {
      const config = PROVIDERS[p];
      return config && process.env[config.apiKeyEnvVar];
    });

    if (availableChain.length === 0) {
      throw new Error(`No AI providers available for task "${taskOrProvider}". Check your API keys.`);
    }

    const errors: string[] = [];

    for (let i = 0; i < availableChain.length; i++) {
      const providerName = availableChain[i];
      const config = PROVIDERS[providerName];

      try {
        console.log(`[AI] Trying ${providerName} for "${taskOrProvider}"${i > 0 ? ` (failover attempt ${i})` : ''}`);
        const result = await callSingleProvider(config, messages);
        if (i > 0) {
          console.log(`[AI] Failover succeeded: ${providerName} handled "${taskOrProvider}" after ${i} failed attempt(s)`);
        }
        return { ...result, failoverAttempts: i };
      } catch (err: any) {
        const errMsg = err.message || String(err);
        errors.push(`${providerName}: ${errMsg}`);
        console.warn(`[AI] ${providerName} failed for "${taskOrProvider}": ${errMsg}`);

        // If this was the last provider, throw with all errors
        if (i === availableChain.length - 1) {
          throw new Error(`All AI providers failed for "${taskOrProvider}":\n${errors.join('\n')}`);
        }
        // Otherwise continue to next provider
      }
    }
  }

  // Fallback: direct provider name (not a task)
  const config = PROVIDERS[taskOrProvider];
  if (!config) {
    throw new Error(`Unknown AI provider or task: ${taskOrProvider}`);
  }
  return callSingleProvider(config, messages);
}
