import type { RegisteredComponent } from "@builder.io/sdk-react-nextjs";
import { KanbanBoard, KanbanColumn, TaskCard, TaskForm, TaskDetailModal, PriorityBadge, AssigneeSelector, StatusSelector } from "@/components/domain";

export const customComponents: RegisteredComponent[] = [
  {
    component: KanbanBoard,
    name: "KanbanBoard",
    inputs: [
      { name: "title", type: "string", defaultValue: "KanbanBoard" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: KanbanColumn,
    name: "KanbanColumn",
    inputs: [
      { name: "title", type: "string", defaultValue: "KanbanColumn" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: TaskCard,
    name: "TaskCard",
    inputs: [
      { name: "title", type: "string", defaultValue: "TaskCard" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: TaskForm,
    name: "TaskForm",
    inputs: [
      { name: "title", type: "string", defaultValue: "TaskForm" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: TaskDetailModal,
    name: "TaskDetailModal",
    inputs: [
      { name: "title", type: "string", defaultValue: "TaskDetailModal" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: PriorityBadge,
    name: "PriorityBadge",
    inputs: [
      { name: "title", type: "string", defaultValue: "PriorityBadge" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: AssigneeSelector,
    name: "AssigneeSelector",
    inputs: [
      { name: "title", type: "string", defaultValue: "AssigneeSelector" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: StatusSelector,
    name: "StatusSelector",
    inputs: [
      { name: "title", type: "string", defaultValue: "StatusSelector" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  }
];
