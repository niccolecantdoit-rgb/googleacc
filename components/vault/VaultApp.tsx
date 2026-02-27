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

const EMPTY_FORM: AccountFormState = {
  email: "",
  username: "",
  f2aType: "UNKNOWN",
  password: "",
  recoveryEmail: "",
  recoveryPhone: "",
  verificationPhone: "",
};

function getErrorMessage(data: unknown, fallback: string) {
  const parsed = data as ApiError;
  return parsed?.error?.message || fallback;
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

  const loadBaseData = useCallback(async () => {
    setError(null);
    setAuthRequired(false);
    try {
      const [tagsRes, accountsRes] = await Promise.all([
        request<{ data: { tags: Tag[] } }>("/api/tags"),
        request<{ data: { accounts: Account[] } }>("/api/accounts"),
      ]);

      setTags(tagsRes.data.tags ?? []);
      setAccounts(accountsRes.data.accounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

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
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 24 }}>
      <h1>Vault App</h1>

      {loading ? <p>加载中...</p> : null}

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {authRequired ? (
        <p style={{ color: "crimson" }}>
          请先登录：<a href="/login">前往登录</a>
        </p>
      ) : null}

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h2>标签管理</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="输入标签名"
          />
          <button onClick={() => void createTag()} disabled={tagBusyId === "__create__"}>
            创建标签
          </button>
        </div>

        <ul style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 18 }}>
          {tags.map((tag) => (
            <li key={tag.id}>
              <span style={{ marginRight: 8 }}>{tag.name}</span>
              <button onClick={() => void renameTag(tag)} disabled={tagBusyId === tag.id}>
                重命名
              </button>
              <button
                onClick={() => void deleteTag(tag)}
                disabled={tagBusyId === tag.id}
                style={{ marginLeft: 6 }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2>账号</h2>
          <button onClick={openCreateModal}>创建账号</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", width: 36 }}>拖拽</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Email</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Username</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>f2aType</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Tags</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>标签分配</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  draggable
                  onDragStart={(event) => handleAccountDragStart(event, account.id)}
                  onDragOver={handleAccountDragOver}
                  onDrop={(event) => void handleAccountDrop(event, account.id)}
                  onDragEnd={handleAccountDragEnd}
                  style={{ backgroundColor: draggingAccountId === account.id ? "#fafafa" : "transparent" }}
                >
                  <td
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      padding: "8px 0",
                      cursor: "grab",
                      userSelect: "none",
                      fontWeight: 600,
                    }}
                    aria-label="拖拽排序"
                  >
                    ≡
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0" }}>{account.email}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0" }}>{account.username || "-"}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0" }}>{account.f2aType}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0" }}>
                    {account.tagIds.length > 0
                      ? account.tagIds.map((tagId) => tagNameById.get(tagId) || tagId).join(", ")
                      : "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {tags.map((tag) => {
                        const checked = account.tagIds.includes(tag.id);
                        return (
                          <label key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                void toggleAccountTag(account.id, tag.id, event.target.checked)
                              }
                            />
                            <span>{tag.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0" }}>
                    <button onClick={() => void openEditModal(account.id)} disabled={formBusy}>
                      编辑
                    </button>
                    <button
                      onClick={() => void deleteAccount(account)}
                      style={{ marginLeft: 6 }}
                      disabled={formBusy}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateModal ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3>创建账号</h3>
          <form onSubmit={submitCreateAccount} style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              placeholder="username"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            />
            <select
              value={form.f2aType}
              onChange={(event) => setForm((prev) => ({ ...prev, f2aType: event.target.value as F2AType }))}
            >
              <option value="UNKNOWN">UNKNOWN</option>
              <option value="LINK">LINK</option>
              <option value="PHONE">PHONE</option>
            </select>
            <input
              placeholder="password (必填)"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <input
              placeholder="recoveryEmail"
              value={form.recoveryEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, recoveryEmail: event.target.value }))}
            />
            <input
              placeholder="recoveryPhone"
              value={form.recoveryPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, recoveryPhone: event.target.value }))}
            />
            <input
              placeholder="verificationPhone"
              value={form.verificationPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, verificationPhone: event.target.value }))}
            />

            {formError ? <p style={{ color: "crimson" }}>{formError}</p> : null}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={formBusy}>
                保存
              </button>
              <button type="button" onClick={closeCreateModal}>
                取消
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showEditModal ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3>编辑账号</h3>
          <form onSubmit={submitEditAccount} style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              placeholder="username"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            />
            <select
              value={form.f2aType}
              onChange={(event) => setForm((prev) => ({ ...prev, f2aType: event.target.value as F2AType }))}
            >
              <option value="UNKNOWN">UNKNOWN</option>
              <option value="LINK">LINK</option>
              <option value="PHONE">PHONE</option>
            </select>
            <input
              placeholder="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <input
              placeholder="recoveryEmail"
              value={form.recoveryEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, recoveryEmail: event.target.value }))}
            />
            <input
              placeholder="recoveryPhone"
              value={form.recoveryPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, recoveryPhone: event.target.value }))}
            />
            <input
              placeholder="verificationPhone"
              value={form.verificationPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, verificationPhone: event.target.value }))}
            />

            {formError ? <p style={{ color: "crimson" }}>{formError}</p> : null}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={formBusy}>
                保存
              </button>
              <button type="button" onClick={closeEditModal}>
                取消
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
