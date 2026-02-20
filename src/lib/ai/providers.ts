// ========================================
// LessonLink AI Provider Abstraction
// Multi-provider support: MiniMax, Claude, DeepSeek, Kimi
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
// Task-to-Provider Mapping
// Change these to switch which AI handles what
// ========================================

export const TASK_PROVIDERS: Record<string, string> = {
  assessment_analysis: 'minimax',
  parent_report: 'minimax',
  translation: 'deepseek',
  session_feedback: 'minimax',  // Phase 16
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

  // Claude API uses a different format: system prompt is separate
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
  // DeepSeek and Kimi both use OpenAI-compatible endpoints
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
// Main Entry Point
// ========================================

export async function callAiProvider(
  taskOrProvider: string,
  messages: AiMessage[]
): Promise<AiResponse> {
  // Resolve task name to provider, or use directly if it's a provider name
  const providerName = TASK_PROVIDERS[taskOrProvider] ?? taskOrProvider;
  const config = PROVIDERS[providerName];

  if (!config) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }

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
