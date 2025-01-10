import type { ChatCompletionMessage } from './types';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function getPerplexityResponse(messages: ChatCompletionMessage[]): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY is not set in the environment');
    throw new Error('Missing Perplexity API key');
  }

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful college advisor assistant. Provide accurate, concise information about colleges, admissions, programs, and campus life. Base your responses on factual information. When responding about specific colleges, focus on their unique features, programs, and requirements.'
          },
          ...messages
        ],
        temperature: 0.2,
        max_tokens: 300,
        top_p: 0.9,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I am unable to provide information about this college at the moment.';
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    return 'I apologize, but I am experiencing technical difficulties. Please try again later.';
  }
}

export async function generateCollegeResponse(
  schoolName: string,
  userMessage: string
): Promise<string> {
  try {
    const messages: ChatCompletionMessage[] = [
      {
        role: 'user',
        content: `Regarding ${schoolName}: ${userMessage}`
      }
    ];

    return await getPerplexityResponse(messages);
  } catch (error) {
    console.error('Error generating college response:', error);
    return 'I apologize, but I am unable to provide information about this college at the moment. Please try again later.';
  }
}