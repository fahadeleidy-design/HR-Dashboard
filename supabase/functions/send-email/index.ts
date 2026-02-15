import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailRequest {
  action:
    | "send_direct"
    | "send_queued"
    | "test_smtp"
    | "process_queue"
    | "get_queue_stats";
  company_id?: string;
  to_email?: string;
  to_name?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  template_key?: string;
  variables?: Record<string, string>;
  priority?: number;
  language?: string;
  batch_size?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = req.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payload: SendEmailRequest;
    try {
      payload = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { action } = payload;

    switch (action) {
      case "send_direct":
        return await handleSendDirect(supabase, payload);
      case "send_queued":
        return await handleSendQueued(supabase, payload);
      case "test_smtp":
        return await handleTestSmtp(supabase, payload);
      case "process_queue":
        return await handleProcessQueue(supabase, payload);
      case "get_queue_stats":
        return await handleGetQueueStats(supabase, payload);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getSmtpConfig(supabase: any, companyId: string) {
  const { data, error } = await supabase
    .from("email_smtp_config")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch SMTP config: ${error.message}`);
  if (!data) throw new Error("No active SMTP configuration found for this company");
  return data;
}

async function sendViaSmtp(
  config: any,
  to: string,
  toName: string,
  subject: string,
  html: string,
  text: string
) {
  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass_encrypted,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: config.default_from_name
      ? `"${config.default_from_name}" <${config.default_from_email}>`
      : config.default_from_email,
    to: toName ? `"${toName}" <${to}>` : to,
    subject,
    text: text || "Please view this email in an HTML-capable client.",
    html: html || undefined,
  };

  await transporter.sendMail(mailOptions);
}

async function handleSendDirect(supabase: any, payload: SendEmailRequest) {
  const { company_id, to_email, subject, body_html, body_text, to_name } = payload;

  if (!company_id || !to_email || !subject) {
    return new Response(
      JSON.stringify({ error: "company_id, to_email, and subject are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const config = await getSmtpConfig(supabase, company_id);
  await sendViaSmtp(config, to_email, to_name || "", subject, body_html || "", body_text || "");

  await supabase.from("email_queue").insert({
    company_id,
    to_email,
    to_name: to_name || "",
    from_email: config.default_from_email,
    from_name: config.default_from_name || "",
    subject,
    body_html: body_html || "",
    body_text: body_text || "",
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ success: true, message: "Email sent successfully" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleSendQueued(supabase: any, payload: SendEmailRequest) {
  const {
    company_id, template_key, to_email, to_name,
    subject, body_html, body_text, variables,
    priority, language
  } = payload;

  if (!company_id || !to_email) {
    return new Response(
      JSON.stringify({ error: "company_id and to_email are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (template_key) {
    const { data: queueId, error } = await supabase.rpc("queue_template_email", {
      p_company_id: company_id,
      p_template_key: template_key,
      p_to_email: to_email,
      p_to_name: to_name || "",
      p_variables: variables || {},
      p_priority: priority || 5,
      p_language: language || "en",
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to queue email: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, queue_id: queueId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!subject) {
    return new Response(
      JSON.stringify({ error: "subject is required when not using a template" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase.from("email_queue").insert({
    company_id,
    to_email,
    to_name: to_name || "",
    subject,
    body_html: body_html || "",
    body_text: body_text || "",
    priority: priority || 5,
    status: "pending",
  }).select("id").maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to queue email: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, queue_id: data?.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleTestSmtp(supabase: any, payload: SendEmailRequest) {
  const { company_id } = payload;

  if (!company_id) {
    return new Response(
      JSON.stringify({ error: "company_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const config = await getSmtpConfig(supabase, company_id);
    const testEmail = config.default_from_email;

    await sendViaSmtp(
      config,
      testEmail,
      "",
      "SMTP Test - HR System",
      "<h2>SMTP Configuration Test</h2><p>This is a test email to verify your SMTP settings are working correctly.</p>",
      "SMTP Configuration Test\n\nThis is a test email to verify your SMTP settings are working correctly."
    );

    await supabase
      .from("email_smtp_config")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_result: "success",
      })
      .eq("id", config.id);

    return new Response(
      JSON.stringify({ success: true, message: "Test email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    let errorMsg = "Unknown SMTP error";

    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else if (error && typeof error === 'object') {
      errorMsg = JSON.stringify(error);
    }

    try {
      await supabase
        .from("email_smtp_config")
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_result: `failed: ${errorMsg.substring(0, 500)}`,
        })
        .eq("company_id", company_id);
    } catch (dbError) {
      console.error("Failed to update test result:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `SMTP test failed: ${errorMsg}`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function handleProcessQueue(supabase: any, payload: SendEmailRequest) {
  const batchSize = payload.batch_size || 10;

  const { data: pendingEmails, error: fetchError } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch queue: ${fetchError.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!pendingEmails || pendingEmails.length === 0) {
    return new Response(
      JSON.stringify({ success: true, processed: 0, message: "No pending emails" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const configCache: Record<string, any> = {};
  let sent = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    try {
      await supabase
        .from("email_queue")
        .update({ status: "sending" })
        .eq("id", email.id);

      if (!configCache[email.company_id]) {
        configCache[email.company_id] = await getSmtpConfig(supabase, email.company_id);
      }
      const config = configCache[email.company_id];

      await sendViaSmtp(
        config,
        email.to_email,
        email.to_name,
        email.subject,
        email.body_html,
        email.body_text
      );

      await supabase
        .from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", email.id);

      sent++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const newRetryCount = (email.retry_count || 0) + 1;
      const newStatus = newRetryCount >= (email.max_retries || 3) ? "failed" : "pending";

      await supabase
        .from("email_queue")
        .update({
          status: newStatus,
          retry_count: newRetryCount,
          last_error: errorMsg,
        })
        .eq("id", email.id);

      failed++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, processed: pendingEmails.length, sent, failed }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetQueueStats(supabase: any, payload: SendEmailRequest) {
  const { company_id } = payload;

  if (!company_id) {
    return new Response(
      JSON.stringify({ error: "company_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("email_queue")
    .select("status")
    .eq("company_id", company_id);

  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch stats: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stats = {
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    total: data?.length || 0,
  };

  for (const row of data || []) {
    if (row.status in stats) {
      stats[row.status as keyof typeof stats]++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, stats }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
