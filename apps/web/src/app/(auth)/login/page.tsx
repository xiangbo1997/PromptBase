"use client";

import Link from "next/link";
import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">登录</h1>
        <p className="text-muted-foreground">请输入您的邮箱和密码</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error.message}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">邮箱</label>
          <input
            className="w-full rounded-md border p-2 bg-background"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">密码</label>
          <input
            className="w-full rounded-md border p-2 bg-background"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-primary p-2 text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "登录中..." : "登录"}
        </button>
      </form>
      <div className="text-center text-sm">
        还没有账号？{" "}
        <Link href="/register" className="text-primary hover:underline">
          立即注册
        </Link>
      </div>
    </div>
  );
}
