// Thin fetch wrapper for Anthropic's Messages API with prompt caching on the
// system prompt. No SDK dependency — keeps the Worker bundle minimal.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type CallOpts = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type AnthropicResponse = {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

export const callAnthropic = async (opts: CallOpts): Promise<AnthropicResponse> => {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('anthropic timeout')),
    opts.timeoutMs ?? 2500,
  );
  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 512,
        temperature: opts.temperature ?? 0,
        // Ephemeral cache marker on the system block enables ~90% discount on
        // subsequent calls within the cache TTL (default 5 min).
        system: [
          {
            type: 'text',
            text: opts.systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: opts.messages,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`anthropic ${resp.status}: ${errText.slice(0, 200)}`);
    }

    return (await resp.json()) as AnthropicResponse;
  } finally {
    clearTimeout(timer);
  }
};
