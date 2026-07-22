import type { RegisteredComponent } from "@builder.io/sdk-react-nextjs";
import { EquipmentCard, EquipmentCatalog, EquipmentFilter, LoanRequestForm, MyLoanRequests, AdminLoanTable, LoanStatusBadge, ApproveLoanButton, RejectLoanButton, MarkAsDeliveredButton, MarkAsReturnedButton } from "@/components/domain";

export const customComponents: RegisteredComponent[] = [
  {
    component: EquipmentCard,
    name: "EquipmentCard",
    inputs: [
      { name: "title", type: "string", defaultValue: "EquipmentCard" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: EquipmentCatalog,
    name: "EquipmentCatalog",
    inputs: [
      { name: "title", type: "string", defaultValue: "EquipmentCatalog" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: EquipmentFilter,
    name: "EquipmentFilter",
    inputs: [
      { name: "title", type: "string", defaultValue: "EquipmentFilter" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: LoanRequestForm,
    name: "LoanRequestForm",
    inputs: [
      { name: "title", type: "string", defaultValue: "LoanRequestForm" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MyLoanRequests,
    name: "MyLoanRequests",
    inputs: [
      { name: "title", type: "string", defaultValue: "MyLoanRequests" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: AdminLoanTable,
    name: "AdminLoanTable",
    inputs: [
      { name: "title", type: "string", defaultValue: "AdminLoanTable" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: LoanStatusBadge,
    name: "LoanStatusBadge",
    inputs: [
      { name: "title", type: "string", defaultValue: "LoanStatusBadge" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: ApproveLoanButton,
    name: "ApproveLoanButton",
    inputs: [
      { name: "title", type: "string", defaultValue: "ApproveLoanButton" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: RejectLoanButton,
    name: "RejectLoanButton",
    inputs: [
      { name: "title", type: "string", defaultValue: "RejectLoanButton" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MarkAsDeliveredButton,
    name: "MarkAsDeliveredButton",
    inputs: [
      { name: "title", type: "string", defaultValue: "MarkAsDeliveredButton" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: MarkAsReturnedButton,
    name: "MarkAsReturnedButton",
    inputs: [
      { name: "title", type: "string", defaultValue: "MarkAsReturnedButton" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  }
];
