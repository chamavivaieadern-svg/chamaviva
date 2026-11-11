"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Save, X, RefreshCw } from "lucide-react";

type Trip = {
  id: string;
  title: string;
  origin: string | null;
  destination: string | null;
  status: string;
  departure_at: string | null;
  church_id: string;
};

const statusOptions = [
  ["scheduled", "Programada"],
  ["awaiting_departure", "Aguardando saída"],
  ["in_progress", "Em deslocamento"],
  ["arrived", "Chegou ao destino"],
  ["completed", "Concluída"],
  ["issue", "Com ocorrência"],
  ["cancelled", "Cancelada"],
];

function dateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TripRecordManager() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [role, setRole] = useState("");
  const [canManageTrips, setCanManageTrips] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", origin: "", destination: "", status: "scheduled", departure_at: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
      const { data: profile, error: profileError } = await db.from("profiles")
        .select("role,can_manage_trips,status").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      setRole(profile?.role || "");
      setCanManageTrips(profile?.role === "admin" || profile?.role === "pastor" ||
        (profile?.role === "trip_manager" && profile?.status === "active" && profile?.can_manage_trips === true));

      const { data, error: queryError } = await db.from("trips")
        .select("id,title,origin,destination,status,departure_at,church_id")
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setTrips((data || []) as Trip[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as viagens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function beginEdit(trip: Trip) {
    setEditingId(trip.id);
    setForm({
      title: trip.title || "",
      origin: trip.origin || "",
      destination: trip.destination || "",
      status: trip.status || "scheduled",
      departure_at: dateInput(trip.departure_at),
    });
    setError("");
    setSuccess("");
  }

  async function save() {
    if (!editingId) return;
    if (!form.title.trim()) {
      setError("Informe o título da viagem.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const db = createClient();
      const payload = {
        title: form.title.trim(),
        origin: form.origin.trim() || null,
        destination: form.destination.trim() || null,
        status: form.status,
        departure_at: form.departure_at ? new Date(form.departure_at).toISOString() : null,
      };
      const { data, error: updateError } = await db.from("trips").update(payload)
        .eq("id", editingId).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Nenhuma alteração foi salva. Verifique se você tem permissão para editar esta viagem.");
      setSuccess("Viagem atualizada e salva no banco de dados.");
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="data-panel" style={{ marginTop: 18 }}>
      <div className="data-panel-head">
        <b>Registros</b>
        <span>{trips.length} registro(s)</span>
        <button type="button" className="module-refresh" onClick={() => void load()}><RefreshCw size={14}/> Atualizar</button>
      </div>
      {error && <p className="module-error">{error}</p>}
      {success && <p className="module-success">{success}</p>}
      {loading ? <p className="data-empty">Carregando viagens...</p> : trips.length === 0 ? (
        <p className="data-empty">Nenhuma viagem encontrada para sua conta.</p>
      ) : (
        <div className="data-table-wrap">
          <table>
            <thead><tr><th>Título</th><th>Origem</th><th>Destino</th><th>Situação</th><th>Saída</th>{canManageTrips && <th>Ações</th>}</tr></thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.id}>
                  <td>{trip.title}</td><td>{trip.origin || "—"}</td><td>{trip.destination || "—"}</td>
                  <td>{statusOptions.find(([value]) => value === trip.status)?.[1] || trip.status}</td>
                  <td>{trip.departure_at ? new Date(trip.departure_at).toLocaleString("pt-BR") : "—"}</td>
                  {canManageTrips && <td><button type="button" className="module-refresh" onClick={() => beginEdit(trip)}><Pencil size={14}/> Editar</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingId && (
        <div className="module-action-form" style={{ marginTop: 16 }}>
          <div className="module-action-heading"><Pencil size={17}/><div><b>Editar viagem</b><small>Altere os dados e salve para gravar no Supabase.</small></div></div>
          <div className="module-action-fields">
            <label className="action-full">Título<input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} required /></label>
            <label>Origem<input value={form.origin} onChange={e => setForm(v => ({ ...v, origin: e.target.value }))} /></label>
            <label>Destino<input value={form.destination} onChange={e => setForm(v => ({ ...v, destination: e.target.value }))} /></label>
            <label>Data e horário de saída<input type="datetime-local" value={form.departure_at} onChange={e => setForm(v => ({ ...v, departure_at: e.target.value }))} /></label>
            <label>Situação<select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value }))}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="user-actions" style={{ marginTop: 12 }}>
            <button type="button" disabled={saving} onClick={() => void save()}><Save size={15}/>{saving ? "Salvando..." : "Salvar alterações"}</button>
            <button type="button" disabled={saving} onClick={() => setEditingId(null)}><X size={15}/> Cancelar</button>
          </div>
        </div>
      )}
      {!canManageTrips && <p className="data-empty">Seu perfil pode visualizar esta viagem, mas não tem permissão para editá-la. Solicite ao ADM a permissão de gestão de viagens.</p>}
    </section>
  );
}
