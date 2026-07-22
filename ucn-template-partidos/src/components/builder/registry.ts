import type { RegisteredComponent } from "@builder.io/sdk-react-nextjs";
import { MatchCard, MatchList, MatchDetail, MatchForm, SportFilter, JoinMatchButton, AvailableSlots, MatchStatusBadge } from "@/components/domain";

export const customComponents: RegisteredComponent[] = [
  {
    component: MatchCard,
    name: "MatchCard",
    inputs: [
      { name: "title", type: "string", defaultValue: "MatchCard" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MatchList,
    name: "MatchList",
    inputs: [
      { name: "title", type: "string", defaultValue: "MatchList" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MatchDetail,
    name: "MatchDetail",
    inputs: [
      { name: "title", type: "string", defaultValue: "MatchDetail" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MatchForm,
    name: "MatchForm",
    inputs: [
      { name: "title", type: "string", defaultValue: "MatchForm" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: SportFilter,
    name: "SportFilter",
    inputs: [
      { name: "title", type: "string", defaultValue: "SportFilter" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: JoinMatchButton,
    name: "JoinMatchButton",
    inputs: [
      { name: "title", type: "string", defaultValue: "JoinMatchButton" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: AvailableSlots,
    name: "AvailableSlots",
    inputs: [
      { name: "title", type: "string", defaultValue: "AvailableSlots" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MatchStatusBadge,
    name: "MatchStatusBadge",
    inputs: [
      { name: "title", type: "string", defaultValue: "MatchStatusBadge" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  }
];
