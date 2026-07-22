"use client";

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createBoardAction, createDomainItemAction, deleteDomainItemAction, quickUpdateTaskAction, updateTaskAction, type ActionResult } from "@/actions/domain.actions";
import { createClient } from "@/lib/supabase/client";
import { getEnvStatus } from "@/lib/env";
import { priorityLabel, statusLabel, todayDateInputValue, type TaskPriority, type TaskStatus } from "@/lib/domain/rules";
import { Button, EmptyState, Field, SelectField, TextareaField } from "@/components/ui";

type Board = { id: string; name: string; description: string };
type Member = { id: string; name: string };
type Task = { id: string; boardId: string; title: string; description: string; status: TaskStatus; priority: TaskPriority; assigneeId?: string; assignee: string; dueDate: string };

const initialAction: ActionResult = { ok: false, message: "" };
const demoBoard: Board = { id: "00000000-0000-0000-0000-000000000000", name: "Tablero demo", description: "Ejemplo de tablero para previsualizar componentes." };
const demoMembers: Member[] = [{ id: "00000000-0000-0000-0000-000000000001", name: "Responsable demo" }];
const demoTasks: Task[] = [
  { id: "t1", boardId: demoBoard.id, title: "Definir historias de usuario", description: "Preparar alcance inicial", status: "pending", priority: "high", assigneeId: demoMembers[0].id, assignee: "Responsable demo", dueDate: "2026-08-01" },
  { id: "t2", boardId: demoBoard.id, title: "Probar tablero", description: "Validar estados", status: "in_progress", priority: "medium", assigneeId: demoMembers[0].id, assignee: "Responsable demo", dueDate: "2026-08-05" }
];

export function DomainLanding({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Gestion de tareas</p>
      <h1 className="mt-3 text-4xl font-bold text-slate-950">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-700">{description}</p>
    </main>
  );
}

export function DomainDashboard() {
  const data = useKanbanData();
  const selectedBoard = data.boards.find((board) => board.id === data.selectedBoardId);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col justify-between gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Mis tableros</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">Crea tableros para organizar tareas por estado, prioridad y responsable.</p>
        </div>
        <CreateBoardModal onCreated={(boardId) => data.refresh(boardId)} />
      </header>

      {data.loading ? <p className="text-sm text-slate-600">Cargando tableros...</p> : null}

      {data.boards.length ? (
        <>
          <BoardPicker boards={data.boards} selectedBoardId={data.selectedBoardId} onSelect={data.setSelectedBoardId} />
          {selectedBoard ? <KanbanBoard board={selectedBoard} data={data} /> : null}
          <TaskTable tasks={data.tasks} />
        </>
      ) : (
        <EmptyState title="Aun no tienes tableros" description="Presiona Crear nuevo tablero para definir el primero con titulo y descripcion." />
      )}
    </div>
  );
}

export function AdminPanel() {
  return <EmptyState title="Administracion" description="La membresia de tableros se protege con RLS. Puedes extender este panel para invitar integrantes." />;
}

function useKanbanData() {
  const demoMode = !getEnvStatus().supabaseReady;
  const [boards, setBoards] = useState<Board[]>(demoMode ? [demoBoard] : []);
  const [selectedBoardId, setSelectedBoardId] = useState(demoMode ? demoBoard.id : "");
  const [members, setMembers] = useState<Member[]>(demoMode ? demoMembers : []);
  const [tasks, setTasks] = useState<Task[]>(demoMode ? demoTasks : []);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (preferredBoardId?: string) => {
    if (demoMode) return;

    setLoading(true);
    const supabase = createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    const { data: boardRows } = await supabase.from("boards").select("id,name,description").order("created_at", { ascending: true });
    const nextBoards = (boardRows ?? []).map((board) => ({
      id: String(board.id),
      name: String(board.name),
      description: String(board.description ?? "")
    }));

    const nextSelectedBoardId = preferredBoardId && nextBoards.some((board) => board.id === preferredBoardId)
      ? preferredBoardId
      : nextBoards.some((board) => board.id === selectedBoardId)
        ? selectedBoardId
        : nextBoards[0]?.id ?? "";

    setBoards(nextBoards);
    setSelectedBoardId(nextSelectedBoardId);

    if (!nextSelectedBoardId) {
      setMembers(userId ? [{ id: userId, name: "Yo" }] : []);
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data: memberRows } = await supabase.from("board_members").select("user_id").eq("board_id", nextSelectedBoardId);
    const memberIds = (memberRows ?? []).map((member) => String(member.user_id));
    const nextMembers: Member[] = memberIds.length
      ? memberIds.map((id) => ({ id, name: id === userId ? "Yo" : `Integrante ${id.slice(0, 8)}` }))
      : userId ? [{ id: userId, name: "Yo" }] : [];

    const { data: taskRows } = await supabase
      .from("tasks")
      .select("id,board_id,title,description,status,priority,assignee_id,due_date")
      .eq("board_id", nextSelectedBoardId)
      .order("created_at", { ascending: true });

    setMembers(nextMembers);
    setTasks((taskRows ?? []).map((task) => {
      const assigneeId = task.assignee_id ? String(task.assignee_id) : undefined;
      return {
        id: String(task.id),
        boardId: String(task.board_id),
        title: String(task.title),
        description: String(task.description ?? ""),
        status: String(task.status) as TaskStatus,
        priority: String(task.priority) as TaskPriority,
        assigneeId,
        assignee: nextMembers.find((member) => member.id === assigneeId)?.name ?? "Sin asignar",
        dueDate: task.due_date ? String(task.due_date) : ""
      };
    }));
    setLoading(false);
  }, [demoMode, selectedBoardId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { boards, selectedBoardId, setSelectedBoardId, members, tasks, setTasks, loading, refresh };
}

function BoardPicker({ boards, selectedBoardId, onSelect }: { boards: Board[]; selectedBoardId: string; onSelect: (id: string) => void }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {boards.map((board) => {
        const selected = board.id === selectedBoardId;
        return (
          <button
            key={board.id}
            className={"rounded-md border p-4 text-left transition " + (selected ? "border-emerald-700 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300")}
            type="button"
            onClick={() => onSelect(board.id)}
          >
            <h2 className="text-lg font-bold text-slate-950">{board.name}</h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-slate-700">{board.description || "Sin descripcion."}</p>
          </button>
        );
      })}
    </section>
  );
}

export function KanbanBoard({ board, data, title = "Tablero Kanban" }: { board?: Board; data?: ReturnType<typeof useKanbanData>; title?: string }) {
  if (data) return <KanbanBoardContent board={board} data={data} title={title} />;
  return <StandaloneKanbanBoard board={board} title={title} />;
}

function StandaloneKanbanBoard({ board, title }: { board?: Board; title: string }) {
  const localData = useKanbanData();
  return <KanbanBoardContent board={board} data={localData} title={title} />;
}

function KanbanBoardContent({ board, data, title }: { board?: Board; data: ReturnType<typeof useKanbanData>; title: string }) {
  const activeBoard = board ?? data.boards.find((item) => item.id === data.selectedBoardId) ?? demoBoard;
  const [priority, setPriority] = useState("all");
  const filtered = useMemo(() => priority === "all" ? data.tasks : data.tasks.filter((task) => task.priority === priority), [data.tasks, priority]);

  const updateStatus = (id: string, status: TaskStatus) => {
    data.setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    void quickUpdateTaskAction({ id, status });
  };
  const removeTask = (id: string) => {
    data.setTasks((current) => current.filter((task) => task.id !== id));
  };

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">{activeBoard.name || title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{activeBoard.description || "Sin descripcion."}</p>
        </div>
        <CreateTaskModal boardId={activeBoard.id} members={data.members} onCreated={() => data.refresh(activeBoard.id)} />
      </div>

      <SelectField label="Filtrar prioridad" name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
        <option value="all">Todas</option>
        <option value="low">Baja</option>
        <option value="medium">Media</option>
        <option value="high">Alta</option>
      </SelectField>

      <div className="grid gap-4 md:grid-cols-3">
        {(["pending", "in_progress", "completed"] as TaskStatus[]).map((status) => (
          <KanbanColumn key={status} status={status} tasks={filtered.filter((task) => task.status === status)} members={data.members} onMove={updateStatus} onDelete={removeTask} />
        ))}
      </div>
    </section>
  );
}

export function KanbanColumn({ status = "pending", tasks = [], members = demoMembers, onMove, onDelete }: { status?: TaskStatus; tasks?: Task[]; members?: Member[]; onMove?: (id: string, status: TaskStatus) => void; onDelete?: (id: string) => void }) {
  const label = statusLabel(status);
  return (
    <section className="min-h-72 rounded-md border border-slate-200 bg-slate-50 p-4" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/task-id"); if (id) onMove?.(id, status); }}>
      <h3 className="font-semibold text-slate-950">{label}</h3>
      <div className="mt-3 grid gap-3">
        {tasks.map((task) => <TaskCard key={task.id} task={task} members={members} onDelete={onDelete} />)}
        {!tasks.length ? <p className="text-sm text-slate-500">Sin tareas.</p> : null}
      </div>
    </section>
  );
}

export function TaskCard({ task = demoTasks[0], members = demoMembers, onDelete }: { task?: Task; members?: Member[]; onDelete?: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <article draggable onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex justify-between gap-2">
        <h4 className="font-medium text-slate-950">{task.title}</h4>
        <div className="flex items-start gap-2">
          <PriorityBadge priority={task.priority} />
          <TaskActions task={task} onDeleted={onDelete} />
        </div>
      </div>
      {task.description ? <p className="mt-2 text-sm leading-5 text-slate-600">{task.description}</p> : null}
      <p className="mt-2 text-sm text-slate-600">{task.assignee} {task.dueDate ? `- vence ${task.dueDate}` : ""}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "Cerrar" : "Editar"}</Button>
      </div>
      {editing ? <TaskForm mode="edit" task={task} boardId={task.boardId} members={members} /> : null}
    </article>
  );
}

function TaskActions({ task, onDeleted }: { task: Task; onDeleted?: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="relative">
      <button className="rounded-md px-2 py-1 text-lg leading-none text-slate-600 hover:bg-slate-100" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Opciones de tarea">
        ...
      </button>
      {menuOpen ? (
        <div className="absolute right-0 z-20 mt-1 min-w-32 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          <button className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" type="button" onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}>
            Eliminar
          </button>
        </div>
      ) : null}
      <Modal title="Eliminar tarea" open={confirmOpen} onClose={() => { setConfirmOpen(false); setConfirmed(false); setMessage(""); }}>
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-slate-700">Esta accion eliminara la tarea <span className="font-semibold">{task.title}</span>. Para confirmar, marca la casilla y presiona eliminar.</p>
          {message ? <p className="text-sm text-red-700">{message}</p> : null}
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input className="mt-1" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Confirmo que quiero eliminar esta tarea.</span>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setConfirmOpen(false); setConfirmed(false); setMessage(""); }}>Cancelar</Button>
            <Button type="button" variant="danger" disabled={!confirmed || pending} onClick={() => startTransition(async () => {
              const result = await deleteDomainItemAction(task.id);
              if (!result.ok) {
                setMessage(result.message);
                return;
              }
              onDeleted?.(task.id);
              setConfirmOpen(false);
              setConfirmed(false);
            })}>Eliminar tarea</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CreateBoardModal({ onCreated }: { onCreated: (boardId?: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Crear nuevo tablero</Button>
      <Modal title="Nuevo tablero" open={open} onClose={() => setOpen(false)}>
        <BoardForm onSuccess={(boardId) => { setOpen(false); onCreated(boardId); }} />
      </Modal>
    </>
  );
}

function CreateTaskModal({ boardId, members, onCreated }: { boardId: string; members: Member[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Anadir tarea</Button>
      <Modal title="Nueva tarea" open={open} onClose={() => setOpen(false)}>
        <TaskForm boardId={boardId} members={members} onSuccess={() => { setOpen(false); onCreated(); }} />
      </Modal>
    </>
  );
}

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 id="modal-title" className="text-xl font-bold text-slate-950">{title}</h2>
          <button className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" type="button" onClick={onClose} aria-label="Cerrar modal">Cerrar</button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function BoardForm({ onSuccess }: { onSuccess?: (boardId?: string) => void }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(createBoardAction, initialAction);

  useEffect(() => {
    if (state.ok) onSuccess?.(state.id);
  }, [state.id, state.ok, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Titulo" name="name" placeholder="Proyecto final" required />
      <TextareaField label="Descripcion" name="description" placeholder="Describe el objetivo del tablero." />
      <Button type="submit">Crear tablero</Button>
    </form>
  );
}

export function TaskForm({ mode = "create", task, boardId = demoBoard.id, members = demoMembers, onSuccess }: { mode?: "create" | "edit"; task?: Task; boardId?: string; members?: Member[]; onSuccess?: () => void }) {
  const action = mode === "edit" ? updateTaskAction : createDomainItemAction;
  const [state, formAction] = useActionState<ActionResult, FormData>(action, initialAction);

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  return (
    <form action={formAction} className="grid gap-4">
      <h2 className="text-lg font-bold text-slate-950">{mode === "edit" ? "Editar tarea" : "Crear tarea"}</h2>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      {task?.id ? <input type="hidden" name="id" value={task.id} /> : null}
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="status" value={task?.status ?? "pending"} />
      {mode === "edit" ? <input type="hidden" name="priority" value={task?.priority ?? "medium"} /> : null}
      <Field label="Titulo" name="title" defaultValue={task?.title} required />
      <TextareaField label="Descripcion" name="description" defaultValue={task?.description} />
      <AssigneeSelector members={members} selectedId={task?.assigneeId} />
      {mode === "create" ? (
        <SelectField label="Prioridad" name="priority" defaultValue={task?.priority ?? "medium"}>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </SelectField>
      ) : null}
      <Field label="Vencimiento" name="dueDate" type="date" min={todayDateInputValue()} defaultValue={task?.dueDate} />
      <Button type="submit">{mode === "edit" ? "Actualizar tarea" : "Guardar tarea"}</Button>
    </form>
  );
}

export function TaskDetailModal({ title = "Detalle de tarea" }: { title?: string }) {
  return <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-slate-700">Detalle preparado para descripcion, responsable, estado y prioridad persistidos.</p></section>;
}

export function PriorityBadge({ priority = "medium" }: { priority?: TaskPriority }) {
  const color = priority === "high" ? "bg-red-100 text-red-800" : priority === "medium" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-800";
  return <span className={"rounded-full px-2 py-1 text-xs font-semibold " + color}>{priorityLabel(priority)}</span>;
}

export function AssigneeSelector({ members = demoMembers, selectedId = "" }: { members?: Member[]; selectedId?: string }) {
  return (
    <SelectField label="Responsable" name="assigneeId" defaultValue={selectedId}>
      <option value="">Sin asignar</option>
      {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
    </SelectField>
  );
}

export function StatusSelector({ value = "pending", onChange }: { value?: TaskStatus; onChange?: (value: TaskStatus) => void }) {
  return (
    <SelectField label="Estado" name="status" value={value} onChange={(event) => onChange?.(event.target.value as TaskStatus)}>
      <option value="pending">Pendiente</option>
      <option value="in_progress">En progreso</option>
      <option value="completed">Completada</option>
    </SelectField>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold text-slate-950">Vista de tabla</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-600">
              <th className="py-2 pr-3">Tarea</th>
              <th className="py-2 pr-3">Responsable</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b last:border-0">
                <td className="py-2 pr-3">{task.title}</td>
                <td className="py-2 pr-3">{task.assignee}</td>
                <td className="py-2 pr-3">{statusLabel(task.status)}</td>
                <td className="py-2 pr-3">{priorityLabel(task.priority)}</td>
              </tr>
            ))}
            {!tasks.length ? <tr><td className="py-3 text-slate-500" colSpan={4}>Sin tareas registradas.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
