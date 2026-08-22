import { useQuery } from "@tanstack/react-query";

import { getEvolutionConnectionState } from "@/lib/evolution.functions";

export function useEvolutionConnectionState() {
  return useQuery({
    queryKey: ["evolution-connection-state"],
    queryFn: async () => {
      const result = await getEvolutionConnectionState();
      return result as {
        instance?: {
          instanceName?: string;
          state?: string;
        };
      };
    },
    refetchInterval: 10000,
  });
}
