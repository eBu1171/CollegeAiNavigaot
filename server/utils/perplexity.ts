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
        temperature: 0.3,
        max_tokens: 500,
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

export async function analyzeAdmissionChances(
  schoolName: string,
  profile: {
    gpa: number;
    sat?: number;
    act?: number;
    extracurriculars: string;
    essays: string;
  }
): Promise<string> {
  try {
    const messages: ChatCompletionMessage[] = [
      {
        role: 'user',
        content: `Please analyze admission chances for ${schoolName} with the following student profile:

GPA: ${profile.gpa}
${profile.sat ? `SAT: ${profile.sat}` : ''}
${profile.act ? `ACT: ${profile.act}` : ''}

Extracurricular Activities:
${profile.extracurriculars}

Essays and Personal Statement Summary:
${profile.essays}

Please provide a detailed analysis including:
1. Academic fit analysis (GPA and test scores comparison with typical admits)
2. Extracurricular activities evaluation
3. Essay/personal statement assessment
4. Overall admission chances
5. Specific recommendations to improve the application
6. Any unique factors or programs that might affect admission

Format the response in clear sections with bullet points where appropriate.`
      }
    ];

    return await getPerplexityResponse(messages);
  } catch (error) {
    console.error('Error analyzing admission chances:', error);
    return 'I apologize, but I am unable to analyze admission chances at the moment. Please try again later.';
  }
}