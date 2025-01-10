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
            content: `You are a highly knowledgeable college advisor with expertise in US higher education. 
            Focus on providing accurate, detailed information about:
            - College admissions requirements and processes
            - Academic programs and majors
            - Campus life and student experiences
            - Research opportunities and faculty expertise
            - Financial aid and scholarships
            - Career outcomes and alumni success

            Base your responses on factual, up-to-date information. When discussing specific colleges, 
            include concrete details about their unique features, programs, and requirements. 
            If uncertain about specific details, acknowledge this and provide general guidance 
            while suggesting where to find more accurate information.`
          },
          ...messages
        ],
        temperature: 0.3, // Lower temperature for more focused, factual responses
        max_tokens: 500, // Increased token limit for more detailed responses
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
    return data.choices[0]?.message?.content || 'I apologize, but I am unable to provide information about this college at the moment. Please try again or check the official college website for the most accurate information.';
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    return 'I apologize, but I am experiencing technical difficulties. Please check the official college website or try again later.';
  }
}

export async function generateCollegeResponse(
  schoolName: string,
  userMessage: string
): Promise<string> {
  try {
    // Enhanced context for better college-specific responses
    const messages: ChatCompletionMessage[] = [
      {
        role: 'user',
        content: `Regarding ${schoolName}: ${userMessage}\n\nPlease provide specific, accurate information about this college, including relevant statistics, programs, or requirements where applicable.`
      }
    ];

    return await getPerplexityResponse(messages);
  } catch (error) {
    console.error('Error generating college response:', error);
    return 'I apologize, but I am unable to provide information about this college at the moment. Please check the official college website or try again later.';
  }
}