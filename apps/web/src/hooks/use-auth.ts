import { useMutation } from "@tanstack/react-query";
import { request } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";

interface LoginResponse {
  user: { id: string; email: string; displayName?: string | null };
  organizations: Array<{ id: string; name: string; slug: string; roleKey: string }>;
  tokens: { accessToken: string; refreshToken: string };
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      return response;
    },
    onSuccess: (data) => {
      const u = data.user;
      setAuth({ id: u.id, email: u.email, name: u.displayName ?? u.email }, data.tokens.accessToken, data.organizations);
      router.push("/prompts");
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { name?: string; email: string; password: string }) => {
      const response = await request<LoginResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ displayName: data.name, email: data.email, password: data.password }),
      });
      return response;
    },
    onSuccess: (data) => {
      const u = data.user;
      setAuth({ id: u.id, email: u.email, name: u.displayName ?? u.email }, data.tokens.accessToken, data.organizations);
      router.push("/prompts");
    },
  });
}
