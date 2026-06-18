import { redirect } from "next/navigation";

export default function NewExpenseRequestPage() {
  redirect("/finance/expenses");
}
