"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, ShieldCheck, Trash2, Lock, Unlock, RefreshCw, Eye, EyeOff, Pencil, Save, X } from "lucide-react";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  matricula: string | null;
  role: string;
  status: string;
  church_id: string;
  phone: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  address: string | null;
};
type Church = { id: string; name: string };
type EditForm = {
  full_name: string;
  email: string;
  matricula: string;
  new_password: string;
  role: string;
  church_id: string;
  phone: string;
  whatsapp: string;
  birth_date: string;
  address: string;
};
const roles = [["pastor", "Pastor"], ["leader", "Líder de grupo"], ["driver", "Motorista"], ["director", "Dirigente"], ["preacher", "Pregador"], ["musician", "Músico"]];

export default function UsersAdmin() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("pastor");
  const [church, setChurch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  async function load() {
    const db = createClient();
    const [usersResponse, churchesResponse] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      db.from("churches").select("id,name").order("name"),
    ]);
    const usersData = await usersResponse.json();
    if (!usersResponse.ok) throw new Error(usersData.error || "Não foi possível carregar os usuários.");
    setUsers(usersData.users || []);
    if (churchesResponse.error) throw new Error("Não foi possível carregar as igrejas.");
    if (churchesResponse.data) setChurches(churchesResponse.data);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar usuários."));
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: name, email, matricula, password, role, church_id: church || undefined }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Falha ao criar usuário.");
      setNotice("Usuário criado com sucesso. O acesso pode ser feito pelo e-mail ou pela matrícula cadastrada.");
      setName(""); setEmail(""); setMatricula(""); setPassword(""); setRole("pastor"); setChurch("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao criar usuário."); }
    finally { setBusy(false); }
  }

  function startEdit(user: Profile) {
    setEditing(user);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email || "",
      matricula: user.matricula || "",
      new_password: "",
      role: user.role,
      church_id: user.church_id || "",
      phone: user.phone || "",
      whatsapp: user.whatsapp || "",
      birth_date: user.birth_date || "",
      address: user.address || "",
    });
    setError(""); setNotice("");
  }

  function updateEdit<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((current) => current ? { ...current, [key]: value } : current);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editForm) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch("/api/admin/users/" + editing.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editForm.full_name,
          email: editForm.email,
          matricula: editForm.matricula,
          new_password: editForm.new_password || undefined,
          role: editForm.role,
          church_id: editForm.church_id,
          phone: editForm.phone,
          whatsapp: editForm.whatsapp,
          birth_date: editForm.birth_date || null,
          address: editForm.address,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Falha ao salvar alterações.");
      setNotice("Alterações salvas com sucesso.");
      setEditing(null); setEditForm(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao salvar alterações."); }
    finally { setBusy(false); }
  }

  async function changeStatus(id: string, status: string) {
    if (!confirm(status === "blocked" ? "Bloquear este usuário?" : "Reativar este usuário?")) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/users/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não foi possível alterar a situação.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao alterar situação."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remover definitivamente este usuário? Esta ação não pode ser desfeita.")) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/users/" + id, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não foi possível remover o usuário.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao remover usuário."); }
    finally { setBusy(false); }
  }

  return <div className="admin-module">
    <div className="module-title-row"><div><span className="auth-kicker">ADMINISTRAÇÃO GERAL</span><h1>Usuários e equipes</h1><p>Somente o ADM pode criar, editar, bloquear ou remover contas.</p></div><button type="button" className="module-refresh" onClick={() => load().catch((e) => setError(e.message))} disabled={busy}><RefreshCw size={15}/> Atualizar</button></div>
    {error && <p className="module-error" role="alert">{error}</p>}
    {notice && <p className="module-success" role="status">{notice}</p>}

    <form className="invite-panel" onSubmit={createUser}>
      <div className="invite-heading"><UserPlus size={19}/><div><b>Criar usuário</b><small>A conta será criada na hora. Informe a senha inicial para a pessoa já poder acessar o sistema.</small></div></div>
      <div className="invite-fields">
        <label>Nome completo<input required value={name} onChange={e => setName(e.target.value)} placeholder="Nome do usuário" autoComplete="name"/></label>
        <label>E-mail (opcional)<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@email.com" autoComplete="email"/></label>
        <label>Número de matrícula (opcional)<input value={matricula} onChange={e => setMatricula(e.target.value.toUpperCase())} placeholder="Ex.: CV-0001" autoComplete="off"/></label>
        <label>Senha inicial<div className="password-field"><input required type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
        <label>Função<select value={role} onChange={e => setRole(e.target.value)}>{roles.map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
        <label>Igreja/região<select required value={church} onChange={e => setChurch(e.target.value)}><option value="">Selecione uma igreja</option>{churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      </div>
      <button className="module-primary" disabled={busy}><UserPlus size={16}/>{busy ? "Criando usuário..." : "Criar usuário"}</button>
    </form>

    {editing && editForm && <form className="invite-panel" onSubmit={saveEdit}>
      <div className="invite-heading"><Pencil size={19}/><div><b>Editar usuário</b><small>Atualize os dados abaixo. Deixe a nova senha vazia para manter a senha atual.</small></div></div>
      <div className="invite-fields">
        <label>Nome completo<input required value={editForm.full_name} onChange={e => updateEdit("full_name", e.target.value)} autoComplete="name"/></label>
        <label>E-mail (opcional)<input type="email" value={editForm.email} onChange={e => updateEdit("email", e.target.value)} autoComplete="email"/></label>
        <label>Número de matrícula (opcional)<input value={editForm.matricula} onChange={e => updateEdit("matricula", e.target.value.toUpperCase())} placeholder="Ex.: CV-0001"/></label>
        <label>Nova senha<input type="password" minLength={8} value={editForm.new_password} onChange={e => updateEdit("new_password", e.target.value)} placeholder="Deixe vazio para manter"/></label>
        <label>Telefone<input type="tel" value={editForm.phone} onChange={e => updateEdit("phone", e.target.value)} placeholder="(00) 00000-0000"/></label>
        <label>WhatsApp<input type="tel" value={editForm.whatsapp} onChange={e => updateEdit("whatsapp", e.target.value)} placeholder="(00) 00000-0000"/></label>
        <label>Data de nascimento<input type="date" value={editForm.birth_date} onChange={e => updateEdit("birth_date", e.target.value)}/></label>
        <label>Função<select required value={editForm.role} onChange={e => updateEdit("role", e.target.value)}>{roles.map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
        <label>Igreja/região<select required value={editForm.church_id} onChange={e => updateEdit("church_id", e.target.value)}><option value="">Selecione uma igreja</option>{churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label style={{gridColumn:"1 / -1"}}>Endereço<input value={editForm.address} onChange={e => updateEdit("address", e.target.value)} placeholder="Rua, número, bairro, cidade"/></label>
      </div>
      <div className="user-actions" style={{marginTop:16}}>
        <button className="module-primary" type="submit" disabled={busy}><Save size={16}/>{busy ? "Salvando..." : "Salvar alterações"}</button>
        <button type="button" className="module-refresh" disabled={busy} onClick={() => { setEditing(null); setEditForm(null); }}><X size={16}/> Cancelar</button>
      </div>
    </form>}

    <section className="users-table-panel">
      <div className="users-table-heading"><div><b>Contas cadastradas</b><small>{users.length} usuário(s)</small></div><span><ShieldCheck size={15}/> Acesso administrativo</span></div>
      <div className="users-table-scroll"><table><thead><tr><th>Nome / acesso</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        {users.map(u => <tr key={u.id}><td><b>{u.full_name || "Sem nome"}</b><small>{u.email || "Sem e-mail"}{u.matricula ? " • Matrícula: " + u.matricula : ""}</small></td><td>{roles.find(r => r[0] === u.role)?.[1] || u.role}</td><td><span className={"user-status " + u.status}>{u.status === "active" ? "Ativo" : u.status === "blocked" ? "Bloqueado" : "Pendente"}</span></td><td><div className="user-actions"><button type="button" onClick={() => startEdit(u)} title="Editar usuário" disabled={busy}><Pencil size={15}/></button>{u.status === "blocked" ? <button type="button" onClick={() => changeStatus(u.id,"active")} title="Reativar" disabled={busy}><Unlock size={15}/></button> : <button type="button" onClick={() => changeStatus(u.id,"blocked")} title="Bloquear" disabled={busy}><Lock size={15}/></button>}<button type="button" className="danger-action" onClick={() => remove(u.id)} title="Remover" disabled={busy}><Trash2 size={15}/></button></div></td></tr>)}
      </tbody></table></div>
    </section>
  </div>;
}
