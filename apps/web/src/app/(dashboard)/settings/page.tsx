export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">管理您的个人资料和团队配置</p>
      </div>
      <div className="grid gap-6">
        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">个人资料</h2>
          <div className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <label className="text-sm font-medium">显示名称</label>
              <input className="rounded-md border p-2 bg-background" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">邮箱地址</label>
              <input className="rounded-md border p-2 bg-muted cursor-not-allowed" disabled />
            </div>
            <button className="w-fit rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">保存更改</button>
          </div>
        </section>
      </div>
    </div>
  );
}
