"use client";

import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type F2AType = "LINK" | "PHONE" | "UNKNOWN";

type Tag = {
  id: string;
  name: string;
  order: number;
};

type Account = {
  id: string;
  email: string;
  username: string | null;
  f2aType: F2AType;
  tagIds: string[];
};

type AccountSensitive = {
  password: string;
  recoveryEmail: string | null;
  recoveryPhone: string | null;
  verificationPhone: string | null;
};

type ApiError = {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
};

type AccountFormState = {
  email: string;
  username: string;
  f2aType: F2AType;
  password: string;
  recoveryEmail: string;
  recoveryPhone: string;
  verificationPhone: string;
};

type AccountFilters = {
  q: string;
  f2aType: "" | F2AType;
  tagIds: string[];
  onlyMissing: boolean;
};

const EMPTY_FORM: AccountFormState = {
  email: "",
  username: "",
  f2aType: "UNKNOWN",
  password: "",
  recoveryEmail: "",
  recoveryPhone: "",
  verificationPhone: "",
};

function getEmptyFilters(): AccountFilters {
  return {
    q: "",
    f2aType: "",
    tagIds: [],
    onlyMissing: false,
  };
}

function getErrorMessage(data: unknown, fallback: string) {
  const parsed = data as ApiError;
  return parsed?.error?.message || fallback;
}

// UI Components
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1"></circle>
      <circle cx="9" cy="5" r="1"></circle>
      <circle cx="9" cy="19" r="1"></circle>
      <circle cx="15" cy="12" r="1"></circle>
      <circle cx="15" cy="5" r="1"></circle>
      <circle cx="15" cy="19" r="1"></circle>
    </svg>
  );
}

export default function VaultApp() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const [newTagName, setNewTagName] = useState("");
  const [tagBusyId, setTagBusyId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [draggingAccountId, setDraggingAccountId] = useState<string | null>(null);
  const [tagDropTargetId, setTagDropTargetId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AccountFilters>(() => getEmptyFilters());
  const [appliedFilters, setAppliedFilters] = useState<AccountFilters>(() => getEmptyFilters());

  const tagNameById = useMemo(() => {
    return new Map(tags.map((tag) => [tag.id, tag.name]));
  }, [tags]);

  const request = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (response.status === 401) {
      setAuthRequired(true);
      throw new Error("请先登录");
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, "请求失败"));
    }

    return payload as T;
  }, []);

  const buildAccountsUrl = useCallback((nextFilters: AccountFilters) => {
    const params = new URLSearchParams();
    if (nextFilters.q.trim()) {
      params.set("q", nextFilters.q.trim());
    }
    if (nextFilters.f2aType) {
      params.set("f2aType", nextFilters.f2aType);
    }
    if (nextFilters.tagIds.length > 0) {
      params.set("tagIds", nextFilters.tagIds.join(","));
    }
    if (nextFilters.onlyMissing) {
      params.set("onlyMissing", "1");
    }

    const query = params.toString();
    return query ? `/api/accounts?${query}` : "/api/accounts";
  }, []);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(false);
    try {
      const accountsUrl = buildAccountsUrl(appliedFilters);
      const [tagsRes, accountsRes] = await Promise.all([
        request<{ data: { tags: Tag[] } }>("/api/tags"),
        request<{ data: { accounts: Account[] } }>(accountsUrl),
      ]);

      setTags(tagsRes.data.tags ?? []);
      setAccounts(accountsRes.data.accounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, buildAccountsUrl, request]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  function applyFilters() {
    setAppliedFilters({ ...filters, tagIds: [...filters.tagIds] });
  }

  function resetFilters() {
    setFilters(getEmptyFilters());
    setAppliedFilters(getEmptyFilters());
  }

  function toggleFilterTag(tagId: string, checked: boolean) {
    setFilters((prev) => {
      if (checked) {
        if (prev.tagIds.includes(tagId)) {
          return prev;
        }
        return { ...prev, tagIds: [...prev.tagIds, tagId] };
      }
      return { ...prev, tagIds: prev.tagIds.filter((id) => id !== tagId) };
    });
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) {
      setError("标签名不能为空");
      return;
    }
    setError(null);
    setTagBusyId("__create__");
    try {
      await request("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewTagName("");
      await loadBaseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建标签失败");
    } finally {
      setTagBusyId(null);
    }
  }

  async function renameTag(tag: Tag) {
    const nextName = window.prompt("请输入新的标签名", tag.name);
    if (nextName === null) {
      return;
    }
    if (nextName.trim() === "") {
      setError("标签名不能为空");
      return;
    }

    setError(null);
    setTagBusyId(tag.id);
    try {
      await request(`/api/tags/${tag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: nextName.trim() }),
      });
      await loadBaseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "重命名标签失败");
    } finally {
      setTagBusyId(null);
    }
  }

  async function deleteTag(tag: Tag) {
    const confirmed = window.confirm(`确认删除标签「${tag.name}」吗？`);
    if (!confirmed) {
      return;
    }

    setError(null);
    setTagBusyId(tag.id);
    try {
      await request(`/api/tags/${tag.id}`, { method: "DELETE" });
      await loadBaseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除标签失败");
    } finally {
      setTagBusyId(null);
    }
  }

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setFormError(null);
    setFormBusy(false);
  }

  async function submitCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.email.trim() || !form.password.trim()) {
      setFormError("创建账号时 email 和 password 必填");
      return;
    }

    setFormError(null);
    setFormBusy(true);
    setError(null);

    try {
      await request("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          username: form.username,
          f2aType: form.f2aType,
          password: form.password,
          recoveryEmail: form.recoveryEmail,
          recoveryPhone: form.recoveryPhone,
          verificationPhone: form.verificationPhone,
        }),
      });

      closeCreateModal();
      await loadBaseData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "创建账号失败");
    } finally {
      setFormBusy(false);
    }
  }

  async function openEditModal(accountId: string) {
    setFormBusy(true);
    setFormError(null);
    setError(null);

    try {
      const detail = await request<{
        data: { account: Account; sensitive: AccountSensitive };
      }>(`/api/accounts/${accountId}?includeSensitive=1`);

      setEditingAccountId(accountId);
      setForm({
        email: detail.data.account.email,
        username: detail.data.account.username ?? "",
        f2aType: detail.data.account.f2aType,
        password: detail.data.sensitive.password ?? "",
        recoveryEmail: detail.data.sensitive.recoveryEmail ?? "",
        recoveryPhone: detail.data.sensitive.recoveryPhone ?? "",
        verificationPhone: detail.data.sensitive.verificationPhone ?? "",
      });
      setShowEditModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载账号详情失败");
    } finally {
      setFormBusy(false);
    }
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingAccountId(null);
    setFormError(null);
    setFormBusy(false);
  }

  async function submitEditAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAccountId) {
      return;
    }

    setFormError(null);
    setFormBusy(true);
    setError(null);

    const payload: Record<string, string> = {
      email: form.email.trim(),
      username: form.username,
      f2aType: form.f2aType,
    };

    // 统一策略：敏感字段若为空则省略，表示“保持原值不变”；仅提交用户明确填写的新值。
    if (form.password.trim() !== "") {
      payload.password = form.password;
    }
    if (form.recoveryEmail.trim() !== "") {
      payload.recoveryEmail = form.recoveryEmail;
    }
    if (form.recoveryPhone.trim() !== "") {
      payload.recoveryPhone = form.recoveryPhone;
    }
    if (form.verificationPhone.trim() !== "") {
      payload.verificationPhone = form.verificationPhone;
    }

    try {
      await request(`/api/accounts/${editingAccountId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      closeEditModal();
      await loadBaseData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "更新账号失败");
    } finally {
      setFormBusy(false);
    }
  }

  async function deleteAccount(account: Account) {
    const confirmed = window.confirm(`确认删除账号「${account.email}」吗？`);
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await request(`/api/accounts/${account.id}`, { method: "DELETE" });
      await loadBaseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除账号失败");
    }
  }

  async function toggleAccountTag(accountId: string, tagId: string, checked: boolean) {
    setError(null);
    try {
      if (checked) {
        await request(`/api/accounts/${accountId}/tags`, {
          method: "POST",
          body: JSON.stringify({ tagId }),
        });
      } else {
        await request(`/api/accounts/${accountId}/tags`, {
          method: "DELETE",
          body: JSON.stringify({ tagId }),
        });
      }

      await loadBaseData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新账号标签失败");
    }
  }

  async function reorderAccounts(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    const fromIndex = accounts.findIndex((account) => account.id === sourceId);
    const toIndex = accounts.findIndex((account) => account.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const previousAccounts = accounts;
    const nextAccounts = [...accounts];
    const [moved] = nextAccounts.splice(fromIndex, 1);
    nextAccounts.splice(toIndex, 0, moved);

    setError(null);
    setAccounts(nextAccounts);

    try {
      await request("/api/accounts/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: nextAccounts.map((account) => account.id) }),
      });
    } catch (err) {
      setAccounts(previousAccounts);
      setError(err instanceof Error ? err.message : "账号排序失败，已恢复原顺序");
    }
  }

  function handleAccountDragStart(event: DragEvent<HTMLTableRowElement>, accountId: string) {
    setDraggingAccountId(accountId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", accountId);
  }

  function handleAccountDragOver(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async function handleAccountDrop(event: DragEvent<HTMLTableRowElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggingAccountId || event.dataTransfer.getData("text/plain");
    setDraggingAccountId(null);
    if (!sourceId) {
      return;
    }
    await reorderAccounts(sourceId, targetId);
  }

  function handleAccountDragEnd() {
    setDraggingAccountId(null);
    setTagDropTargetId(null);
  }

  function handleTagDragOver(event: DragEvent<HTMLLIElement>, tagId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (tagDropTargetId !== tagId) {
      setTagDropTargetId(tagId);
    }
  }

  async function handleTagDrop(event: DragEvent<HTMLLIElement>, tagId: string) {
    event.preventDefault();
    const sourceId = draggingAccountId || event.dataTransfer.getData("text/plain");
    setTagDropTargetId(null);
    setDraggingAccountId(null);
    if (!sourceId) {
      return;
    }
    await toggleAccountTag(sourceId, tagId, true);
  }

  function handleTagDragLeave(tagId: string) {
    if (tagDropTargetId === tagId) {
      setTagDropTargetId(null);
    }
  }

  return (
    <div className="vault-shell">
      {error ? (
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="text-error">{error}</p>
        </div>
      ) : null}

      {authRequired ? (
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="text-error">
            请先登录：<a href="/login" style={{ textDecoration: 'underline' }}>前往登录</a>
          </p>
        </div>
      ) : null}

      {/* Left Sidebar: Tags */}
      <aside>
        <section className="vault-panel">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>标签管理</h2>
          <p className="vault-hint">将账号拖拽至标签快速分类</p>
          
          <div className="vault-inline" style={{ marginBottom: '1.5rem' }}>
            <input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="输入标签名..."
              style={{ width: '100%' }}
            />
            <button onClick={() => void createTag()} disabled={tagBusyId === "__create__" || !newTagName.trim()} style={{ padding: '0.625rem' }} aria-label="创建标签">
              <PlusIcon />
            </button>
          </div>

          <ul className="tag-list">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="tag-item"
                onDragOver={(event) => handleTagDragOver(event, tag.id)}
                onDrop={(event) => void handleTagDrop(event, tag.id)}
                onDragLeave={() => handleTagDragLeave(tag.id)}
                style={{
                  borderColor: tagDropTargetId === tag.id ? "var(--accent-primary)" : "var(--border-default)",
                  backgroundColor: tagDropTargetId === tag.id ? "var(--bg-surface-hover)" : undefined,
                }}
              >
                <span style={{ fontWeight: 500 }}>{tag.name}</span>
                <div className="tag-actions">
                  <button className="ghost-btn" onClick={() => void renameTag(tag)} disabled={tagBusyId === tag.id} title="重命名">
                    <EditIcon />
                  </button>
                  <button
                    className="danger-btn"
                    onClick={() => void deleteTag(tag)}
                    disabled={tagBusyId === tag.id}
                    title="删除"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
            {tags.length === 0 && !loading && (
              <li style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>暂无标签</li>
            )}
          </ul>
        </section>
      </aside>

      {/* Main Content: Accounts */}
      <main style={{ margin: 0, width: '100%' }}>
        <section className="vault-panel" style={{ padding: '2rem' }}>
          <div className="vault-header">
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>账号库</h2>
            <button onClick={openCreateModal}>
              <PlusIcon />
              添加账号
            </button>
          </div>

          <div className="vault-filter-box">
            <div style={{ display: "flex", gap: '1rem', flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
                <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', display: 'flex' }}>
                  <SearchIcon />
                </div>
                <input
                  placeholder="搜索账号或备注..."
                  value={filters.q}
                  onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>

              <select
                value={filters.f2aType}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    f2aType: event.target.value as "" | F2AType,
                  }))
                }
                style={{ flex: '0 1 auto' }}
              >
                <option value="">所有 2FA 类型</option>
                <option value="LINK">LINK</option>
                <option value="PHONE">PHONE</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>

              <label style={{ display: "inline-flex", alignItems: "center", gap: '0.5rem', cursor: 'pointer', flex: '0 1 auto' }}>
                <input
                  type="checkbox"
                  checked={filters.onlyMissing}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      onlyMissing: event.target.checked,
                    }))
                  }
                />
                <span style={{ fontSize: '0.9375rem' }}>仅显示缺失恢复信息</span>
              </label>
            </div>

            {tags.length > 0 && (
              <div>
                <div className="vault-filter-label">按标签过滤</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: '0.75rem' }}>
                  {tags.map((tag) => {
                    const checked = filters.tagIds.includes(tag.id);
                    return (
                      <label key={`filter-tag-${tag.id}`} style={{ display: "inline-flex", alignItems: "center", gap: '0.375rem', cursor: 'pointer', background: checked ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)', padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-full)', border: `1px solid ${checked ? 'var(--accent-primary)' : 'var(--border-default)'}`, transition: 'all 0.2s ease' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleFilterTag(tag.id, event.target.checked)}
                          style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: checked ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{tag.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="vault-inline" style={{ marginTop: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button type="button" className="ghost-btn" onClick={resetFilters}>
                重置
              </button>
              <button type="button" onClick={applyFilters}>
                <FilterIcon />
                应用筛选
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="vault-table">
              <thead>
                <tr>
                  <th style={{ width: 40, paddingLeft: '1rem', paddingRight: '0' }}></th>
                  <th>邮箱账号</th>
                  <th>用户名</th>
                  <th>2FA</th>
                  <th>标签</th>
                  <th style={{ width: 120 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading && accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state">加载中...</td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state">未找到匹配的账号。</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr
                      key={account.id}
                      draggable
                      onDragStart={(event) => handleAccountDragStart(event, account.id)}
                      onDragOver={handleAccountDragOver}
                      onDrop={(event) => void handleAccountDrop(event, account.id)}
                      onDragEnd={handleAccountDragEnd}
                      style={{ 
                        backgroundColor: draggingAccountId === account.id ? "var(--bg-surface-elevated)" : undefined,
                        opacity: draggingAccountId === account.id ? 0.6 : 1
                      }}
                    >
                      <td className="drag-handle" aria-label="拖拽排序" style={{ paddingLeft: '1rem', paddingRight: '0' }}>
                        <GripIcon />
                      </td>
                      <td style={{ fontWeight: 500 }}>{account.email}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{account.username || <span style={{ opacity: 0.3 }}>-</span>}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: account.f2aType === 'LINK' ? 'rgba(16, 185, 129, 0.1)' : account.f2aType === 'PHONE' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: account.f2aType === 'LINK' ? 'var(--accent-success)' : account.f2aType === 'PHONE' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                        }}>
                          {account.f2aType}
                        </span>
                      </td>
                      <td>
                        {account.tagIds.length > 0 ? (
                          <div className="tag-badges">
                            {account.tagIds.map((tagId) => (
                              <span key={tagId} className="tag-badge">
                                {tagNameById.get(tagId) || tagId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>未分类</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="ghost-btn" style={{ padding: '0.375rem 0.625rem' }} onClick={() => void openEditModal(account.id)} disabled={formBusy} title="编辑">
                            <EditIcon />
                          </button>
                          <button
                            className="danger-btn"
                            style={{ padding: '0.375rem 0.625rem' }}
                            onClick={() => void deleteAccount(account)}
                            disabled={formBusy}
                            title="删除"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Create Modal */}
      {showCreateModal ? (
        <div className="modal-overlay">
          <div className="vault-modal">
            <h3>添加新账号</h3>
            <form onSubmit={submitCreateAccount} className="modal-form-grid">
              <div className="modal-form-row">
                <label>邮箱 (必填)</label>
                <input
                  required
                  placeholder="example@gmail.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="modal-form-row">
                  <label>密码 (必填)</label>
                  <input
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
                <div className="modal-form-row">
                  <label>2FA 类型</label>
                  <select
                    value={form.f2aType}
                    onChange={(event) => setForm((prev) => ({ ...prev, f2aType: event.target.value as F2AType }))}
                  >
                    <option value="UNKNOWN">UNKNOWN</option>
                    <option value="LINK">LINK</option>
                    <option value="PHONE">PHONE</option>
                  </select>
                </div>
              </div>

              <div className="modal-form-row">
                <label>用户名</label>
                <input
                  placeholder="选填"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="modal-form-row">
                  <label>恢复邮箱</label>
                  <input
                    placeholder="选填"
                    value={form.recoveryEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, recoveryEmail: event.target.value }))}
                  />
                </div>
                <div className="modal-form-row">
                  <label>恢复手机</label>
                  <input
                    placeholder="选填"
                    value={form.recoveryPhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, recoveryPhone: event.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-form-row">
                <label>验证手机号</label>
                <input
                  placeholder="选填"
                  value={form.verificationPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, verificationPhone: event.target.value }))}
                />
              </div>

              {formError ? <p className="text-error">{formError}</p> : null}

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeCreateModal}>
                  取消
                </button>
                <button type="submit" disabled={formBusy}>
                  保存账号
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {showEditModal ? (
        <div className="modal-overlay">
          <div className="vault-modal">
            <h3>编辑账号</h3>
            <form onSubmit={submitEditAccount} className="modal-form-grid">
              <div className="modal-form-row">
                <label>邮箱</label>
                <input
                  required
                  placeholder="example@gmail.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="modal-form-row">
                  <label>密码 (留空不修改)</label>
                  <input
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
                <div className="modal-form-row">
                  <label>2FA 类型</label>
                  <select
                    value={form.f2aType}
                    onChange={(event) => setForm((prev) => ({ ...prev, f2aType: event.target.value as F2AType }))}
                  >
                    <option value="UNKNOWN">UNKNOWN</option>
                    <option value="LINK">LINK</option>
                    <option value="PHONE">PHONE</option>
                  </select>
                </div>
              </div>

              <div className="modal-form-row">
                <label>用户名</label>
                <input
                  placeholder="选填"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="modal-form-row">
                  <label>恢复邮箱</label>
                  <input
                    placeholder="选填"
                    value={form.recoveryEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, recoveryEmail: event.target.value }))}
                  />
                </div>
                <div className="modal-form-row">
                  <label>恢复手机</label>
                  <input
                    placeholder="选填"
                    value={form.recoveryPhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, recoveryPhone: event.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-form-row">
                <label>验证手机号</label>
                <input
                  placeholder="选填"
                  value={form.verificationPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, verificationPhone: event.target.value }))}
                />
              </div>

              <div className="modal-form-row">
                <label>分配标签</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: '0.5rem', marginTop: '0.25rem', padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  {tags.map((tag) => {
                    const account = accounts.find(a => a.id === editingAccountId);
                    const checked = account?.tagIds.includes(tag.id) || false;
                    return (
                      <label key={`edit-tag-${tag.id}`} style={{ display: "inline-flex", alignItems: "center", gap: '0.375rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            editingAccountId && void toggleAccountTag(editingAccountId, tag.id, event.target.checked)
                          }
                        />
                        <span style={{ fontSize: '0.875rem' }}>{tag.name}</span>
                      </label>
                    );
                  })}
                  {tags.length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>暂无可选标签</span>}
                </div>
              </div>

              {formError ? <p className="text-error">{formError}</p> : null}

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeEditModal}>
                  取消
                </button>
                <button type="submit" disabled={formBusy}>
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
