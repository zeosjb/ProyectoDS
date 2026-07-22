"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { createBoardAction, createDomainItemAction, deleteDomainItemAction, quickUpdateTaskAction, updateTaskAction, type ActionResult } from "@/actions/domain.actions";
import { createClient } from "@/lib/supabase/client";
import { getEnvStatus } from "@/lib/env";
import { priorityLabel, type TaskPriority, type TaskStatus } from "@/lib/domain/rules";
import { Button, EmptyState, Field, SelectField, TextareaField } from "@/components/ui";

type Board = { id: string; name: string };
type Member = { id: string; name: string };
type Task = { id: string; boardId: string; title: string; description: string; status: TaskStatus; priority: TaskPriority; assigneeId?: string; assignee: string; dueDate: string };

const initialAction: ActionResult = { ok: false, message: "" };
const demoBoard: Board = { id: "00000000-0000-0000-0000-000000000000", name: "Tablero demo" };
const demoMembers: Member[] = [{ id: "00000000-0000-0000-0000-000000000001", name: "Responsable demo" }];
const demoTasks: Task[] = [
  { id: "t1", boardId: demoBoard.id, title: "Definir historias de usuario", description: "Preparar alcance inicial", status: "pending", priority: "high", assigneeId: demoMembers[0].id, assignee: "Responsable demo", dueDate: "2026-08-01" },
  { id: "t2", boardId: demoBoard.id, title: "Probar tablero", description: "Validar estados", status: "in_progress", priority: "medium", assigneeId: demoMembers[0].id, assignee: "Responsable demo", dueDate: "2026-08-05" }
];

export function DomainLanding({ title, description }: { title: string; description: string }) {
  return <main className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-4xl font-bold">{title}</h1><p className="mt-3 max-w-2xl text-slate-700">{description}</p><section className="mt-8"><KanbanBoard /></section></main>;
}

export function DomainDashboard() {
  return <div className="grid gap-8"><BoardSetup /><KanbanBoard /><TaskTable /></div>;
}

export function AdminPanel() {
  return <EmptyState title="Administracion" description="La membresia de tableros se protege con RLS. Puedes extender este panel para invitar integrantes." />;
}

function useKanbanData() {
  const [boards, setBoards] = useState<Board[]>([demoBoard]);
  const [selectedBoardId, setSelectedBoardId] = useState(demoBoard.id);
  const [members, setMembers] = useState<Member[]>(demoMembers);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getEnvStatus().supabaseReady) return;
    let mounted = true;
    void (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: claimsData } = await supabase.auth.getClaims();
      const userId = claimsData?.claims?.sub;
      const { data: boardRows } = await supabase.from("boards").select("id,name").order("created_at", { ascending: true });
      if (!mounted) return;
      if (boardRows?.length) {
        const nextBoards = boardRows.map((board) => ({ id: String(board.id), name: String(board.name) }));
        setBoards(nextBoards);
        setSelectedBoardId((current) => nextBoards.some((board) => board.id === current) ? current : nextBoards[0].id);
      }
      const boardId = boardRows?.[0]?.id ? String(boardRows[0].id) : selectedBoardId;
      const { data: memberRows } = await supabase.from("board_members").select("user_id").eq("board_id", boardId);
      const memberIds = (memberRows ?? []).map((member) => String(member.user_id));
      const nextMembers: Member[] = memberIds.length ? memberIds.map((id) => ({ id, name: id === userId ? "Yo" : `Integrante ${id.slice(0, 8)}` })) : demoMembers;
      const { data: taskRows } = await supabase.from("tasks").select("id,board_id,title,description,status,priority,assignee_id,due_date").eq("board_id", boardId).order("created_at", { ascending: true });
      if (mounted) {
        setMembers(nextMembers);
        if (taskRows?.length) {
          setTasks(taskRows.map((task) => {
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
        } else {
          setTasks([]);
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedBoardId]);

  return { boards, selectedBoardId, setSelectedBoardId, members, tasks, setTasks, loading };
}

export function BoardSetup() {
  const [state, formAction] = useActionState<ActionResult, FormData>(createBoardAction, initialAction);
  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">Crear tablero</h2>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Nombre del tablero" name="name" defaultValue="Mi tablero" required />
      <Button type="submit">Crear tablero</Button>
    </form>
  );
}

export function KanbanBoard({ title = "Tablero Kanban" }: { title?: string }) {
  const { boards, selectedBoardId, setSelectedBoardId, members, tasks, setTasks, loading } = useKanbanData();
  const [priority, setPriority] = useState("all");
  const filtered = useMemo(() => priority === "all" ? tasks : tasks.filter((task) => task.priority === priority), [tasks, priority]);
  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    void quickUpdateTaskAction({ id, status });
  };
  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SelectField label="Tablero" name="board" value={selectedBoardId} onChange={(event) => setSelectedBoardId(event.target.value)}>{boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}</SelectField>
        <SelectField label="Filtrar prioridad" name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">Todas</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></SelectField>
      </div>
      <TaskForm boardId={selectedBoardId} members={members} />
      <h2 className="text-2xl font-bold">{title}</h2>
      {loading ? <p className="text-sm text-slate-600">Cargando tareas...</p> : null}
      <div className="grid gap-4 md:grid-cols-3">{(["pending", "in_progress", "completed"] as TaskStatus[]).map((status) => <KanbanColumn key={status} status={status} tasks={filtered.filter((task) => task.status === status)} members={members} onMove={updateStatus} />)}</div>
    </section>
  );
}

export function KanbanColumn({ status = "pending", tasks = [], members = demoMembers, onMove }: { status?: TaskStatus; tasks?: Task[]; members?: Member[]; onMove?: (id: string, status: TaskStatus) => void }) {
  const label = status === "pending" ? "Pendiente" : status === "in_progress" ? "En progreso" : "Completada";
  return <section className="min-h-72 rounded-md border border-slate-200 bg-white p-4" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/task-id"); if (id) onMove?.(id, status); }}><h3 className="font-semibold">{label}</h3><div className="mt-3 grid gap-3">{tasks.map((task) => <TaskCard key={task.id} task={task} members={members} onMove={onMove} />)}{!tasks.length ? <p className="text-sm text-slate-500">Sin tareas.</p> : null}</div></section>;
}

export function TaskCard({ task = demoTasks[0], members = demoMembers, onMove }: { task?: Task; members?: Member[]; onMove?: (id: string, status: TaskStatus) => void }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <article draggable onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)} className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex justify-between gap-2"><h4 className="font-medium">{task.title}</h4><PriorityBadge priority={task.priority} /></div>
      <p className="mt-2 text-sm text-slate-600">{task.assignee} {task.dueDate ? `- vence ${task.dueDate}` : ""}</p>
      <StatusSelector value={task.status} onChange={(status) => onMove?.(task.id, status)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "Cerrar" : "Editar"}</Button>
        <Button variant="danger" disabled={pending} onClick={() => { if (window.confirm("Confirmas eliminar esta tarea?")) startTransition(async () => { const result = await deleteDomainItemAction(task.id); setMessage(result.message); }); }}>Eliminar</Button>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
      {editing ? <TaskForm mode="edit" task={task} boardId={task.boardId} members={members} /> : null}
    </article>
  );
}

export function TaskForm({ mode = "create", task, boardId = demoBoard.id, members = demoMembers }: { mode?: "create" | "edit"; task?: Task; boardId?: string; members?: Member[] }) {
  const action = mode === "edit" ? updateTaskAction : createDomainItemAction;
  const [state, formAction] = useActionState<ActionResult, FormData>(action, initialAction);
  return (
    <form action={formAction} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">{mode === "edit" ? "Editar tarea" : "Crear tarea"}</h2>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      {task?.id ? <input type="hidden" name="id" value={task.id} /> : null}
      <input type="hidden" name="boardId" value={boardId} />
      <Field label="Titulo" name="title" defaultValue={task?.title} required />
      <TextareaField label="Descripcion" name="description" defaultValue={task?.description} />
      <AssigneeSelector members={members} selectedId={task?.assigneeId} />
      <StatusSelector value={task?.status ?? "pending"} />
      <SelectField label="Prioridad" name="priority" defaultValue={task?.priority ?? "medium"}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></SelectField>
      <Field label="Vencimiento" name="dueDate" type="date" defaultValue={task?.dueDate} />
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
  return <SelectField label="Responsable" name="assigneeId" defaultValue={selectedId}><option value="">Sin asignar</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</SelectField>;
}

export function StatusSelector({ value = "pending", onChange }: { value?: TaskStatus; onChange?: (value: TaskStatus) => void }) {
  return <SelectField label="Estado" name="status" value={value} onChange={(event) => onChange?.(event.target.value as TaskStatus)}><option value="pending">Pendiente</option><option value="in_progress">En progreso</option><option value="completed">Completada</option></SelectField>;
}

function TaskTable() {
  const { tasks } = useKanbanData();
  return <section className="rounded-md border border-slate-200 bg-white p-4"><h2 className="text-xl font-bold">Vista de tabla</h2><table className="mt-3 w-full text-left text-sm"><thead><tr><th>Tarea</th><th>Responsable</th><th>Estado</th><th>Prioridad</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-t"><td className="py-2">{task.title}</td><td>{task.assignee}</td><td>{task.status}</td><td>{priorityLabel(task.priority)}</td></tr>)}</tbody></table></section>;
}
