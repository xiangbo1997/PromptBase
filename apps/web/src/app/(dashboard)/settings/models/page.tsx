"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import {
  useModelProviders,
  useCreateModelProvider,
  useDeleteModelProvider,
  useUpdateModelProvider,
} from "@/hooks/use-model-providers";
import { Plus, Trash2, Edit2, ShieldCheck, ShieldAlert, Server } from "lucide-react";
import {
  MODEL_PROVIDER_PROTOCOL_META,
  MODEL_PROVIDER_PROTOCOLS,
  type ModelProviderProtocol,
} from "@promptbase/shared";

interface ProviderFormState {
  name: string;
  provider: ModelProviderProtocol;
  apiKey: string;
  baseUrl: string;
  models: string;
  isActive: boolean;
}

const defaultFormState: ProviderFormState = {
  name: "",
  provider: "openai",
  apiKey: "",
  baseUrl: "",
  models: "",
  isActive: true,
};

export default function ModelProvidersPage() {
  const orgId = useAuthStore((s) => s.orgId) ?? "";
  const { data: providers, isLoading } = useModelProviders(orgId);
  const { mutate: createProvider, isPending: isCreating } = useCreateModelProvider(orgId);
  const { mutate: updateProvider, isPending: isUpdating } = useUpdateModelProvider(orgId);
  const { mutate: deleteProvider } = useDeleteModelProvider(orgId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProviderFormState>(defaultFormState);
  const selectedProtocolMeta = MODEL_PROVIDER_PROTOCOL_META[formData.provider];
  const isSubmitting = isCreating || isUpdating;

  const closeModal = () => {
    setEditingId(null);
    setFormData(defaultFormState);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(defaultFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (provider: NonNullable<typeof providers>[number]) => {
    setEditingId(provider.id);
    setFormData({
      name: provider.name,
      provider: provider.provider,
      apiKey: "",
      baseUrl: provider.baseUrl || "",
      models: provider.models.join("\n"),
      isActive: provider.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const models = formData.models
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);

    if (editingId) {
      updateProvider(
        {
          id: editingId,
          name: formData.name,
          provider: formData.provider,
          ...(formData.apiKey.trim() ? { apiKey: formData.apiKey } : {}),
          baseUrl: formData.baseUrl,
          models,
          isActive: formData.isActive,
        },
        { onSuccess: closeModal },
      );
      return;
    }

    createProvider(
      {
        ...formData,
        models,
      },
      { onSuccess: closeModal },
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm("确定要删除此模型提供商？")) {
      deleteProvider(id);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI 模型配置</h1>
          <p className="text-muted-foreground text-sm">管理模型提供商和 API 密钥</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          添加提供商
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers?.map((provider) => (
          <div key={provider.id} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Server className="h-5 w-5" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(provider)}
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                  title="编辑提供商"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  title="删除提供商"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-lg mb-1">{provider.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">
              <span>{MODEL_PROVIDER_PROTOCOL_META[provider.provider].label}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{provider.models.length} 个模型</span>
              {!provider.isActive && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span>已停用</span>
                </>
              )}
            </div>
            <div className="space-y-2 pt-4 border-t border-dashed">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API 密钥</span>
                {provider.hasApiKey ? (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> 已配置
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                    <ShieldAlert className="h-3.5 w-3.5" /> 未配置
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{MODEL_PROVIDER_PROTOCOL_META[provider.provider].description}</div>
              {provider.baseUrl && (
                <div className="text-xs font-mono text-muted-foreground break-all">Base URL: {provider.baseUrl}</div>
              )}
              <div className="flex flex-wrap gap-1 pt-2">
                {provider.models.map((model) => (
                  <span key={model} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">
                    {model}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-muted/30">
              <h2 className="text-xl font-bold">{editingId ? "编辑模型提供商" : "添加模型提供商"}</h2>
              <button onClick={closeModal} className="text-sm text-muted-foreground hover:text-foreground">
                取消
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">显示名称</label>
                <input
                  required
                  className="w-full rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="例如: 生产环境 OpenAI"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">协议</label>
                  <select
                    className="w-full rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={formData.provider}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        provider: e.target.value as ModelProviderProtocol,
                      })
                    }
                  >
                    {MODEL_PROVIDER_PROTOCOLS.map((protocol) => (
                      <option key={protocol} value={protocol}>
                        {MODEL_PROVIDER_PROTOCOL_META[protocol].label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-5 text-muted-foreground">{selectedProtocolMeta.description}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Base URL (可选)</label>
                  <input
                    className="w-full rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
                    placeholder={selectedProtocolMeta.defaultBaseUrl}
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  />
                  <p className="text-[11px] leading-5 text-muted-foreground">留空则使用该协议默认地址，可填写私有网关、代理或本地服务地址。</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">API 密钥 {editingId ? "(留空则保持不变)" : "(可选)"}</label>
                <input
                  type="password"
                  className="w-full rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary font-mono"
                  placeholder={formData.provider === "ollama" ? "无鉴权可留空" : "sk-..."}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
                <p className="text-[11px] leading-5 text-muted-foreground">
                  官方云服务通常需要填写；本地 Ollama 或内网网关未开启鉴权时可以留空。
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center justify-between">
                  <span>支持模型</span>
                  <span className="text-[11px] font-normal text-muted-foreground">每行一个模型 ID</span>
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-md border p-2 bg-background text-sm outline-none focus:ring-1 focus:ring-primary font-mono resize-none"
                  placeholder={selectedProtocolMeta.placeholderModels.join("\n")}
                  value={formData.models}
                  onChange={(e) => setFormData({ ...formData, models: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>启用此提供商</span>
              </label>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-md border py-2 text-sm font-medium hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
                >
                  {editingId ? "保存修改" : "保存配置"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
