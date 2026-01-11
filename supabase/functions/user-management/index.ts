import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  action: 'list_users' | 'create_user' | 'get_user_email' | 'bulk_create_employee_accounts';
  email?: string;
  companyId?: string;
  userIds?: string[];
  employeeId?: string | null;
  role?: 'super_admin' | 'hr' | 'finance' | 'employee';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || !['super_admin', 'hr'].includes(userRole.role)) {
      throw new Error('User does not have permission to manage users');
    }

    const body: RequestBody = await req.json();

    switch (body.action) {
      case 'list_users': {
        if (!body.companyId) {
          throw new Error('Company ID is required');
        }

        const { data: userRoles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select(`
            id,
            user_id,
            employee_id,
            role,
            created_at,
            employees:employee_id (
              employee_number,
              first_name_en,
              last_name_en
            )
          `)
          .eq('company_id', body.companyId)
          .order('created_at', { ascending: false });

        if (rolesError) throw rolesError;

        // Fetch emails in parallel to speed up response
        const userIds = userRoles?.map(r => r.user_id) || [];
        const userEmailMap = new Map<string, string>();

        const emailPromises = userIds.map(async (userId) => {
          try {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
            return {
              userId,
              email: (!userError && userData?.user?.email) ? userData.user.email : null
            };
          } catch (err) {
            return { userId, email: null };
          }
        });

        const emailResults = await Promise.allSettled(emailPromises);
        emailResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.email) {
            userEmailMap.set(result.value.userId, result.value.email);
          }
        });

        const rolesWithEmails = userRoles?.map(role => {
          const employees = role.employees as any;
          return {
            id: role.id,
            user_id: role.user_id,
            employee_id: role.employee_id,
            role: role.role,
            created_at: role.created_at,
            email: userEmailMap.get(role.user_id) || null,
            employee_number: employees?.employee_number || null,
            first_name_en: employees?.first_name_en || null,
            last_name_en: employees?.last_name_en || null,
          };
        });

        return new Response(
          JSON.stringify({ success: true, data: rolesWithEmails }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      case 'create_user': {
        if (!body.email || !body.companyId || !body.role) {
          throw new Error('Email, company ID, and role are required');
        }

        let userId: string;
        const defaultPassword = 'TestPass123';

        try {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: defaultPassword,
            email_confirm: true,
          });

          if (createError) {
            if (createError.message.includes('already been registered')) {
              const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
              if (listError) throw listError;
              const existingUser = users.find(u => u.email === body.email);
              if (!existingUser) throw new Error('User exists but could not be found');
              userId = existingUser.id;
            } else {
              throw createError;
            }
          } else {
            if (!newUser.user) throw new Error('Failed to create user');
            userId = newUser.user.id;
          }
        } catch (err: any) {
          throw new Error(`Failed to create/find user: ${err.message}`);
        }

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            company_id: body.companyId,
            employee_id: body.employeeId || null,
            role: body.role
          });

        if (roleError) throw roleError;

        return new Response(
          JSON.stringify({ success: true, userId }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      case 'get_user_email': {
        if (!body.userIds || body.userIds.length === 0) {
          throw new Error('User IDs are required');
        }

        const userEmails = [];
        for (const userId of body.userIds) {
          try {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
            userEmails.push({
              userId,
              email: (!userError && userData?.user?.email) ? userData.user.email : null
            });
          } catch (err) {
            console.error(`Failed to fetch email for user ${userId}:`, err);
            userEmails.push({ userId, email: null });
          }
        }

        return new Response(
          JSON.stringify({ success: true, data: userEmails }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      case 'bulk_create_employee_accounts': {
        if (!body.companyId) {
          throw new Error('Company ID is required');
        }

        const { data: employees, error: employeesError } = await supabaseAdmin
          .from('employees')
          .select('id, employee_number, first_name_en, last_name_en, company_id')
          .eq('company_id', body.companyId)
          .eq('status', 'active')
          .not('employee_number', 'is', null);

        if (employeesError) throw employeesError;
        if (!employees || employees.length === 0) {
          throw new Error('No active employees found');
        }

        const { data: existingRoles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('employee_id')
          .eq('company_id', body.companyId)
          .not('employee_id', 'is', null);

        if (rolesError) {
          console.error('Error fetching existing roles:', rolesError);
        }

        const existingEmployeeIds = new Set(existingRoles?.map(r => r.employee_id) || []);

        const results = {
          created: [] as any[],
          skipped: [] as any[],
          failed: [] as any[],
        };

        for (const employee of employees) {
          if (existingEmployeeIds.has(employee.id)) {
            results.skipped.push({
              employee_number: employee.employee_number,
              name: `${employee.first_name_en} ${employee.last_name_en}`,
              reason: 'Already has user account for this company'
            });
            continue;
          }

          try {
            const email = `${employee.employee_number}@temp.local`;
            let userId: string;

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: email,
              password: 'Test123',
              email_confirm: true,
            });

            if (createError) {
              if (createError.message.includes('already been registered')) {
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = users.find(u => u.email === email);
                if (!existingUser) {
                  results.failed.push({
                    employee_number: employee.employee_number,
                    name: `${employee.first_name_en} ${employee.last_name_en}`,
                    error: 'User exists but could not be found'
                  });
                  continue;
                }
                userId = existingUser.id;
              } else {
                results.failed.push({
                  employee_number: employee.employee_number,
                  name: `${employee.first_name_en} ${employee.last_name_en}`,
                  error: createError.message
                });
                continue;
              }
            } else {
              if (!newUser?.user) {
                results.failed.push({
                  employee_number: employee.employee_number,
                  name: `${employee.first_name_en} ${employee.last_name_en}`,
                  error: 'Failed to create user'
                });
                continue;
              }
              userId = newUser.user.id;
            }

            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: userId,
                company_id: employee.company_id,
                employee_id: employee.id,
                role: 'employee'
              });

            if (roleError) {
              results.failed.push({
                employee_number: employee.employee_number,
                name: `${employee.first_name_en} ${employee.last_name_en}`,
                error: roleError.message
              });
              continue;
            }

            results.created.push({
              employee_number: employee.employee_number,
              email: email,
              name: `${employee.first_name_en} ${employee.last_name_en}`
            });
          } catch (err: any) {
            results.failed.push({
              employee_number: employee.employee_number,
              name: `${employee.first_name_en} ${employee.last_name_en}`,
              error: err.message
            });
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: results,
            summary: {
              total: employees.length,
              created: results.created.length,
              skipped: results.skipped.length,
              failed: results.failed.length
            }
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error: any) {
    console.error('User management error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});