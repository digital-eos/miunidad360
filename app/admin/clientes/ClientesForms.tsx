"use client";

import { useActionState, useState } from "react";
import { asignarProyecto, crearCliente, crearUsuario, type FormResult } from "./actions";

const initial: FormResult = { ok: false };

type ClienteOpcion = { id: number; nombre: string };
type ProyectoOpcion = { id: number; name: string; clienteId: number | null };

function Resultado({ state }: { state: FormResult }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.mensaje) {
    return (
      <p role="status" className="text-sm text-foreground-muted">
        {state.mensaje}
      </p>
    );
  }
  return null;
}

const card = "space-y-4 rounded-lg border border-border-subtle bg-surface p-5";
const label = "mb-1.5 block text-sm font-medium";

export function CrearClienteForm() {
  const [state, action, pending] = useActionState(crearCliente, initial);
  return (
    <form action={action} className={card}>
      <h2 className="text-lg font-semibold">Nuevo cliente</h2>
      <div>
        <label htmlFor="cliente-nombre" className={label}>
          Nombre
        </label>
        <input id="cliente-nombre" name="nombre" required className="field" />
      </div>
      <div>
        <label htmlFor="cliente-tipo" className={label}>
          Tipo
        </label>
        <select
          id="cliente-tipo"
          name="tipo"
          required
          defaultValue="desarrolladora"
          className="field"
        >
          <option value="desarrolladora">Desarrolladora</option>
          <option value="estudio">Estudio</option>
          <option value="loteo">Loteo</option>
        </select>
      </div>
      <Resultado state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending ? "Creando…" : "Crear cliente"}
      </button>
    </form>
  );
}

export function CrearUsuarioForm({ clientes }: { clientes: ClienteOpcion[] }) {
  const [state, action, pending] = useActionState(crearUsuario, initial);
  const [rol, setRol] = useState<"cliente" | "superadmin">("cliente");
  return (
    <form action={action} className={card}>
      <h2 className="text-lg font-semibold">Nuevo usuario</h2>
      <div>
        <label htmlFor="usuario-email" className={label}>
          Email
        </label>
        <input id="usuario-email" name="email" type="email" required className="field" />
      </div>
      <div>
        <label htmlFor="usuario-nombre" className={label}>
          Nombre
        </label>
        <input id="usuario-nombre" name="nombre" required className="field" />
      </div>
      <div>
        <label htmlFor="usuario-rol" className={label}>
          Rol
        </label>
        <select
          id="usuario-rol"
          name="rol"
          value={rol}
          onChange={(e) => setRol(e.target.value as "cliente" | "superadmin")}
          className="field"
        >
          <option value="cliente">Cliente (solo ve sus proyectos)</option>
          <option value="superadmin">Superadmin (ve todo)</option>
        </select>
      </div>
      {rol === "cliente" ? (
        <div>
          <label htmlFor="usuario-cliente" className={label}>
            Cliente
          </label>
          <select
            id="usuario-cliente"
            name="clienteId"
            required
            defaultValue=""
            className="field"
          >
            <option value="" disabled>
              Elegí un cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <Resultado state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}

export function AsignarProyectoForm({
  clientes,
  proyectos,
}: {
  clientes: ClienteOpcion[];
  proyectos: ProyectoOpcion[];
}) {
  const [state, action, pending] = useActionState(asignarProyecto, initial);
  return (
    <form action={action} className={card}>
      <h2 className="text-lg font-semibold">Asignar proyecto</h2>
      <div>
        <label htmlFor="asignar-proyecto" className={label}>
          Proyecto
        </label>
        <select
          id="asignar-proyecto"
          name="proyectoId"
          required
          defaultValue=""
          className="field"
        >
          <option value="" disabled>
            Elegí un proyecto
          </option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="asignar-cliente" className={label}>
          Cliente
        </label>
        <select id="asignar-cliente" name="clienteId" defaultValue="" className="field">
          <option value="">Sin cliente (demo)</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <Resultado state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
