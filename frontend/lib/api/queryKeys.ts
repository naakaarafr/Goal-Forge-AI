/**
 * Query Key Factory
 * 
 * Centralizing query keys prevents typos, ensures consistency, and makes 
 * cache invalidation highly predictable across the entire application.
 */

export const queryKeys = {
  // Auth & Users
  auth: {
    me: ['auth', 'me'] as const,
    session: ['auth', 'session'] as const,
  },
  
  // Goals Module
  goals: {
    all: ['goals'] as const,
    lists: () => [...queryKeys.goals.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.goals.lists(), filters] as const,
    details: () => [...queryKeys.goals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.goals.details(), id] as const,
  },
  
  // Performance Module
  performance: {
    all: ['performance'] as const,
    metrics: () => [...queryKeys.performance.all, 'metrics'] as const,
  },
  
  // Team Module
  team: {
    all: ['team'] as const,
    members: () => [...queryKeys.team.all, 'members'] as const,
  },

  // Quarters Module
  quarters: {
    all: ['quarters'] as const,
    lists: () => [...queryKeys.quarters.all, 'list'] as const,
    active: () => [...queryKeys.quarters.all, 'active'] as const,
  },

  // Achievements Module
  achievements: {
    all: ['achievements'] as const,
    lists: () => [...queryKeys.achievements.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.achievements.lists(), filters] as const,
  }
};
