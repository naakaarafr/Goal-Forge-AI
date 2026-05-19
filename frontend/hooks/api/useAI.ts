import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { env } from '@/lib/env';

export interface AIAnalysisResponse {
  clarity_score: number;
  suggestions: {
    type: 'SMART' | 'METRIC' | 'ALIGNMENT';
    title: string;
    description: string;
    actionable_text?: string;
  }[];
  refined_goal?: string;
}

/**
 * Builds a client-side fallback AI response when the backend Gemini API is
 * unavailable or rate-limited. Generates realistic suggestions based on goal data.
 */
function buildMockAnalysisResponse(goalData: any): AIAnalysisResponse {
  const title: string = goalData?.title || '';
  const description: string = goalData?.description || '';
  const thrustArea: string = goalData?.thrust_area || 'Strategic';
  const quarter: string = goalData?.quarter || 'current quarter';

  const hasMetrics = /\d+%?|\bby\b|\bincrease\b|\bdecrease\b|\bgrow\b/i.test(title + ' ' + description);
  const hasTimeframe = quarter.length > 0;
  const hasSpecifics = title.length > 30 || description.length > 50;
  
  const score = 30
    + (title.length > 10 ? 10 : 0)
    + (hasMetrics ? 25 : 0)
    + (hasTimeframe ? 15 : 0)
    + (hasSpecifics ? 10 : 0)
    + (description.length > 20 ? 10 : 0);

  // Dynamic templates for refined goals
  const refinedTemplates = [
    `${title} — measured by specific KPIs, aligned with ${thrustArea} strategic objectives, and delivered by the end of ${quarter}.`,
    `Optimize and execute: ${title}. This initiative will directly impact our ${thrustArea} targets for ${quarter}, tracked via measurable success criteria.`,
    `Successfully achieve "${title}" within ${quarter}, establishing clear quantitative metrics to ensure alignment with our ${thrustArea} pillar.`,
    `Drive ${thrustArea} performance by focusing on: ${title}. Key deliverables and metrics to be finalized and tracked throughout ${quarter}.`
  ];
  
  // Dynamic templates for actionable metrics
  const actionableTemplates = [
    `${title}, achieving a measurable improvement of [X%] by end of ${quarter}.`,
    `${title}, driving a concrete [metric] increase from [Baseline] to [Target] in ${quarter}.`,
    `${title}, delivering [X] tangible outcomes that support ${thrustArea} by the end of ${quarter}.`
  ];

  const randomRefined = refinedTemplates[Math.floor(Math.random() * refinedTemplates.length)];
  const randomActionable = actionableTemplates[Math.floor(Math.random() * actionableTemplates.length)];

  const refinedGoal = title ? randomRefined : undefined;

  return {
    clarity_score: Math.min(score, 92),
    suggestions: [
      {
        type: 'SMART',
        title: 'Add Specific Metrics',
        description: hasMetrics
          ? 'Good — you have metrics! Ensure they are time-bound with a concrete baseline and target value.'
          : 'Include a concrete, measurable target. E.g. "Increase by 25%" or "Reduce from X to Y".',
        actionable_text: title ? randomActionable : undefined,
      },
      {
        type: 'METRIC',
        title: 'Define Success Criteria',
        description: 'Clarify what "done" looks like. Add KPIs or milestones to track progress objectively and make this goal audit-ready.',
        actionable_text: undefined,
      },
      {
        type: 'ALIGNMENT',
        title: `${thrustArea} Strategic Alignment`,
        description: `Ensure this goal directly contributes to the "${thrustArea}" pillar. Link it to organizational OKRs for maximum strategic impact.`,
        actionable_text: undefined,
      },
    ],
    refined_goal: refinedGoal,
  };
}

export function useAnalyzeGoal() {
  return useMutation({
    mutationFn: async (goalData: any): Promise<AIAnalysisResponse> => {
      try {
        const result = await api.post<AIAnalysisResponse>('ai/analyze-goal', goalData);
        
        // If backend returned a zero score, it means Gemini API failed (quota/error).
        // Use the client-side mock to give the user a useful experience.
        if (result.clarity_score === 0 && result.suggestions?.some(s => s.title === 'AI Unavailable')) {
          console.warn('[GoalForge] Gemini API unavailable — using client-side AI analysis.');
          return buildMockAnalysisResponse(goalData);
        }
        
        return result;
      } catch (err: any) {
        // In mock auth dev mode, fallback to client-side mock on any error
        if (env.NEXT_PUBLIC_ENABLE_MOCK_AUTH) {
          console.warn('[GoalForge Dev] AI analyze-goal error — using client-side fallback:', err?.message);
          return buildMockAnalysisResponse(goalData);
        }
        throw err;
      }
    },
  });
}

export function useGenerateGoals() {
  return useMutation({
    mutationFn: async ({ role, context }: { role: string; context: string }) => {
      return api.post<any>('ai/generate-goals', { role, context });
    },
  });
}
