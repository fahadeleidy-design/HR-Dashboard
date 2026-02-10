import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      expiring_documents: 0,
      expiring_contracts: 0,
      expiring_visas: 0,
      pending_approvals_reminded: 0,
      leave_balance_alerts: 0,
      emails_queued: 0,
      errors: [] as string[],
    };

    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiringDocs } = await supabase
        .from("documents")
        .select("id, company_id, employee_id, document_type, expiry_date")
        .lte("expiry_date", thirtyDaysFromNow.toISOString())
        .gte("expiry_date", new Date().toISOString())
        .eq("status", "active");

      if (expiringDocs && expiringDocs.length > 0) {
        results.expiring_documents = expiringDocs.length;

        const notifications = expiringDocs.map((doc: any) => ({
          company_id: doc.company_id,
          notification_type: "document_expiring",
          title: "Document Expiring Soon",
          message: `${doc.document_type} document is expiring on ${doc.expiry_date}`,
          priority: "high",
          category: "compliance",
          related_module: "documents",
          related_entity_type: "document",
          related_entity_id: doc.id,
          recipient_employee_id: doc.employee_id,
        }));

        const { error: notifError } = await supabase
          .from("system_notifications")
          .insert(notifications);

        if (notifError) results.errors.push(`Document notifications: ${notifError.message}`);
      }
    } catch (e) {
      results.errors.push(`Document check: ${e instanceof Error ? e.message : "Unknown"}`);
    }

    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiringContracts } = await supabase
        .from("employee_contracts")
        .select("id, company_id, employee_id, contract_type, end_date")
        .lte("end_date", thirtyDaysFromNow.toISOString())
        .gte("end_date", new Date().toISOString())
        .eq("status", "active");

      if (expiringContracts && expiringContracts.length > 0) {
        results.expiring_contracts = expiringContracts.length;

        const notifications = expiringContracts.map((contract: any) => ({
          company_id: contract.company_id,
          notification_type: "contract_expiring",
          title: "Employee Contract Expiring",
          message: `${contract.contract_type} contract ends on ${contract.end_date}`,
          priority: "high",
          category: "hr",
          related_module: "contracts",
          related_entity_type: "employee_contract",
          related_entity_id: contract.id,
          recipient_employee_id: contract.employee_id,
        }));

        const { error: notifError } = await supabase
          .from("system_notifications")
          .insert(notifications);

        if (notifError) results.errors.push(`Contract notifications: ${notifError.message}`);
      }
    } catch (e) {
      results.errors.push(`Contract check: ${e instanceof Error ? e.message : "Unknown"}`);
    }

    try {
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const { data: expiringVisas } = await supabase
        .from("visa_work_permits")
        .select("id, company_id, employee_id, visa_type, expiry_date")
        .lte("expiry_date", sixtyDaysFromNow.toISOString())
        .gte("expiry_date", new Date().toISOString())
        .in("status", ["active", "approved"]);

      if (expiringVisas && expiringVisas.length > 0) {
        results.expiring_visas = expiringVisas.length;

        const notifications = expiringVisas.map((visa: any) => ({
          company_id: visa.company_id,
          notification_type: "visa_expiring",
          title: "Visa/Work Permit Expiring",
          message: `${visa.visa_type} expires on ${visa.expiry_date}. Renewal action required.`,
          priority: "urgent",
          category: "compliance",
          related_module: "visas",
          related_entity_type: "visa_work_permit",
          related_entity_id: visa.id,
          recipient_employee_id: visa.employee_id,
        }));

        const { error: notifError } = await supabase
          .from("system_notifications")
          .insert(notifications);

        if (notifError) results.errors.push(`Visa notifications: ${notifError.message}`);
      }
    } catch (e) {
      results.errors.push(`Visa check: ${e instanceof Error ? e.message : "Unknown"}`);
    }

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const { data: stalePending } = await supabase
        .from("approval_requests")
        .select("id, company_id, request_type, requested_by, current_step")
        .eq("status", "pending")
        .lte("created_at", twoDaysAgo.toISOString());

      if (stalePending && stalePending.length > 0) {
        results.pending_approvals_reminded = stalePending.length;

        const notifications = stalePending.map((req: any) => ({
          company_id: req.company_id,
          notification_type: "approval_reminder",
          title: "Pending Approval Reminder",
          message: `A ${req.request_type} request is awaiting approval for over 48 hours.`,
          priority: "medium",
          category: "workflow",
          related_module: "pending-requests",
          related_entity_type: "approval_request",
          related_entity_id: req.id,
        }));

        const { error: notifError } = await supabase
          .from("system_notifications")
          .insert(notifications);

        if (notifError) results.errors.push(`Approval reminders: ${notifError.message}`);
      }
    } catch (e) {
      results.errors.push(`Approval check: ${e instanceof Error ? e.message : "Unknown"}`);
    }

    try {
      const { error: processError } = await supabase.functions.invoke("send-email", {
        body: { action: "process_queue", batch_size: 20 },
      });

      if (processError) results.errors.push(`Email queue: ${processError.message}`);
    } catch (e) {
      results.errors.push(`Email queue processing: ${e instanceof Error ? e.message : "Unknown"}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
