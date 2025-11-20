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
  return {
    title: data.title,
    description: data.description || "",
    scope: data.scope,
    status: data.status,
    priority: data.priority,
    startAt: new Date(data.startAt).toISOString(),
    endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
    allDay: data.allDay,
  };
}

// Invalidate all activity queries - handles both array and string keys
export function invalidateActivityQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      
      // Handle array keys
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const firstKey = queryKey[0];
        if (typeof firstKey === 'string' && firstKey.startsWith('/api/activities')) {
          return true;
        }
      }
      
      // Handle plain string keys (defensive) - TypeScript check
      if (typeof queryKey === 'string') {
        return queryKey.startsWith('/api/activities');
      }
      
      return false;
    }
  });
}
