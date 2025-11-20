import type { QueryClient } from "@tanstack/react-query";

// Centralized query key factory - always returns array
export function getActivitiesQueryKey(
  startDate: string,
  endDate: string,
  scopeFilter?: string | null,
  statusFilter?: string | null
): [string] {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(scopeFilter && { scope: scopeFilter }),
    ...(statusFilter && { status: statusFilter }),
  });
  return [`/api/activities?${params.toString()}`];
}

// Normalize activity form data for API submission
export function buildActivityPayload(data: {
  title: string;
  description?: string;
  scope: string;
  status: string;
  priority: string;
  startAt: string;
  endAt?: string;
  allDay: boolean;
}) {
  const startDate = typeof data.startAt === 'string' 
    ? new Date(data.startAt) 
    : data.startAt;
  const endDate = data.endAt 
    ? (typeof data.endAt === 'string' ? new Date(data.endAt) : data.endAt)
    : null;
  
  return {
    title: data.title,
    description: data.description || "",
    scope: data.scope,
    status: data.status,
    priority: data.priority,
    startAt: startDate.toISOString(),
    endAt: endDate ? endDate.toISOString() : null,
    allDay: data.allDay,
  };
}

// Invalidate all activity queries
export function invalidateActivityQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      
      // Query keys are always arrays in TanStack Query v5
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const firstKey = queryKey[0];
        if (typeof firstKey === 'string' && firstKey.startsWith('/api/activities')) {
          return true;
        }
      }
      
      return false;
    }
  });
}
