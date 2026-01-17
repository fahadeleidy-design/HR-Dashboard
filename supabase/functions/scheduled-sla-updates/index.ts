import { createClient } from 'npm:@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();
    const results = {
      approvalSlaUpdated: 0,
      errorLogsProcessed: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    try {
      const { data: approvalCount, error: approvalError } = await supabase.rpc(
        'update_approval_sla_status'
      );

      if (approvalError) {
        results.errors.push(`Approval SLA update error: ${approvalError.message}`);
      } else {
        results.approvalSlaUpdated = approvalCount || 0;
      }
    } catch (error) {
      results.errors.push(`Approval SLA update exception: ${error.message}`);
    }

    try {
      const { data: overdueApprovals, error: overdueError } = await supabase.rpc(
        'get_pending_sla_notifications'
      );

      if (overdueError) {
        results.errors.push(`Get pending notifications error: ${overdueError.message}`);
      } else if (overdueApprovals && overdueApprovals.length > 0) {
        for (const approval of overdueApprovals) {
          try {
            const notificationMessage =
              approval.notification_type === 'breach'
                ? `SLA BREACH: ${approval.request_type} request is overdue and requires immediate attention.`
                : `SLA WARNING: ${approval.request_type} request is approaching its due date.`;

            const { error: notifError } = await supabase.from('system_notifications').insert({
              user_id: approval.current_approver_id,
              title: `SLA ${approval.notification_type.toUpperCase()}: ${approval.request_type}`,
              message: notificationMessage,
              type: 'alert',
              priority: approval.notification_type === 'breach' ? 'high' : 'medium',
              action_url: `/pending-requests?request=${approval.request_id}`,
              metadata: {
                request_id: approval.request_id,
                request_type: approval.request_type,
                sla_status: approval.sla_status,
              },
            });

            if (!notifError) {
              await supabase.rpc('mark_sla_notification_sent', {
                p_request_id: approval.request_id,
                p_notification_type: approval.notification_type,
              });

              results.notificationsSent++;
            }
          } catch (error) {
            results.errors.push(
              `Failed to send notification for ${approval.request_id}: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      results.errors.push(`Notification processing exception: ${error.message}`);
    }

    try {
      await supabase.rpc('cleanup_old_logs');
      results.errorLogsProcessed = 1;
    } catch (error) {
      results.errors.push(`Log cleanup exception: ${error.message}`);
    }

    const executionTime = Date.now() - startTime;

    await supabase.rpc('log_performance_metric', {
      p_company_id: null,
      p_metric_type: 'scheduled_job',
      p_metric_name: 'sla_updates',
      p_execution_time_ms: executionTime,
      p_metadata: {
        results,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        executionTime: `${executionTime}ms`,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Scheduled SLA update error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
