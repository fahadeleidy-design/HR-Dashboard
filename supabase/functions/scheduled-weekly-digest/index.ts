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
      companies_processed: 0,
      digests_queued: 0,
      errors: [] as string[],
    };

    const { data: companies } = await supabase
      .from("companies")
      .select("id, name");

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No companies found", results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekStart = oneWeekAgo.toISOString();

    for (const company of companies) {
      try {
        const [
          { count: newEmployees },
          { count: leaveRequests },
          { count: pendingApprovals },
          { count: expensesClaimed },
          { count: trainingSessions },
        ] = await Promise.all([
          supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .gte("created_at", weekStart),
          supabase
            .from("leave_requests")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .gte("created_at", weekStart),
          supabase
            .from("approval_requests")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("status", "pending"),
          supabase
            .from("expense_claims")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .gte("created_at", weekStart),
          supabase
            .from("training_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .gte("created_at", weekStart),
        ]);

        const digestHtml = buildDigestHtml(company.name, {
          newEmployees: newEmployees || 0,
          leaveRequests: leaveRequests || 0,
          pendingApprovals: pendingApprovals || 0,
          expensesClaimed: expensesClaimed || 0,
          trainingSessions: trainingSessions || 0,
        });

        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("company_id", company.id)
          .in("role", ["super_admin", "admin", "hr"]);

        if (adminRoles && adminRoles.length > 0) {
          const userIds = adminRoles.map((r: any) => r.user_id);

          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const adminEmails = authUsers?.users
            ?.filter((u: any) => userIds.includes(u.id) && u.email)
            ?.map((u: any) => ({ email: u.email, id: u.id })) || [];

          for (const admin of adminEmails) {
            const { error: queueError } = await supabase.from("email_queue").insert({
              company_id: company.id,
              to_email: admin.email,
              to_name: "",
              subject: `Weekly HR Digest - ${company.name}`,
              body_html: digestHtml,
              body_text: `Weekly HR Digest for ${company.name}. New employees: ${newEmployees || 0}, Leave requests: ${leaveRequests || 0}, Pending approvals: ${pendingApprovals || 0}.`,
              status: "pending",
              priority: 7,
            });

            if (queueError) {
              results.errors.push(`Queue email for ${admin.email}: ${queueError.message}`);
            } else {
              results.digests_queued++;
            }
          }
        }

        results.companies_processed++;
      } catch (e) {
        results.errors.push(`Company ${company.name}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    try {
      await supabase.functions.invoke("send-email", {
        body: { action: "process_queue", batch_size: 50 },
      });
    } catch (e) {
      results.errors.push(`Email processing: ${e instanceof Error ? e.message : "Unknown"}`);
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString(), results }),
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

function buildDigestHtml(
  companyName: string,
  stats: {
    newEmployees: number;
    leaveRequests: number;
    pendingApprovals: number;
    expensesClaimed: number;
    trainingSessions: number;
  }
) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0f172a; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .header p { margin: 8px 0 0; opacity: 0.8; font-size: 14px; }
    .content { padding: 32px; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }
    .alert { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .alert-title { font-weight: 600; color: #92400e; margin-bottom: 4px; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly HR Digest</h1>
      <p>${companyName} - Week ending ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
    <div class="content">
      <p style="color:#334155;">Here is your weekly summary of HR activity:</p>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.newEmployees}</div>
          <div class="stat-label">New Employees</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.leaveRequests}</div>
          <div class="stat-label">Leave Requests</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.expensesClaimed}</div>
          <div class="stat-label">Expense Claims</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.trainingSessions}</div>
          <div class="stat-label">Training Enrollments</div>
        </div>
      </div>
      ${stats.pendingApprovals > 0 ? `
      <div class="alert">
        <div class="alert-title">Action Required</div>
        <p style="margin:0;color:#92400e;font-size:14px;">You have <strong>${stats.pendingApprovals}</strong> pending approval(s) that need your attention.</p>
      </div>` : ""}
    </div>
    <div class="footer">
      This is an automated email from your HR Management System.
    </div>
  </div>
</body>
</html>`;
}
