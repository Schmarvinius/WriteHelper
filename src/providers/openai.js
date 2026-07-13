/**
 * OpenAI-compatible provider.
 * Works with any API that implements the OpenAI chat completions interface:
 * OpenAI, LiteLLM, hai proxy, OpenRouter, Ollama (with OpenAI compat), etc.
 */
export default {
  name: 'openai',
  displayName: 'OpenAI-compatible',

  configSchema: [
    { key: 'baseUrl', prompt: 'Base URL', default: 'http://localhost:6655/litellm/v1' },
    { key: 'apiKey', prompt: 'API Key', secret: true, required: true }
  ],

  /**
   * Send a chat completion request and return the result text.
   */
  async chat({ systemPrompt, userText, model, settings }) {
    const { baseUrl, apiKey } = settings;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ]
      })
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error (${res.status}): ${body}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  },

  /**
   * List available models from the proxy.
   */
  async listModels({ settings }) {
    const { baseUrl, apiKey } = settings;

    const res = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error (${res.status}): ${body}`);
    }

    const data = await res.json();
    return (data.data || []).map(m => m.id).sort();
  }
};
