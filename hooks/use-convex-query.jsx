import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";

/**
 * Custom Hook to wrap Convex Queries with React State
 */
export const useConvexQuery = (query, args = {}) => {
  const result = useQuery(query, args);

  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (result === undefined) {
      setLoading(true);
    } else {
      setData(result);
      setError(null);
      setLoading(false);
    }
  }, [result]);

  return {
    data,
    loading,
    error,
  };
};

/**
 * Custom Hook to wrap Convex Mutations with async/loading states
 */
export const useConvexMutation = (mutation) => {
  const mutationFn = useMutation(mutation);

  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (...payload) => {
    setLoading(true);
    setError(null);

    try {
      const response = await mutationFn(...payload);
      setData(response);
      return response;
    } catch (err) {
      setError(err);
      toast.error(err.message || "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, data, loading, error };
};