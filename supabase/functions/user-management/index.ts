import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, Cache-Control, Pragma',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

interface RequestBody {
  action: 'list_users' | 'create_user' | 'get_user_email' | 'bulk_create_employee_accounts' | 'update_role';
  email?: string;
  companyId?: string;
  userIds?: string[];
  employeeId?: string | null;
  role?: 'super_admin' | 'hr' | 'finance' | 'manager' | 'employee';
  roleId?: string;
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

    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id);

    if (roleError || !userRoles || userRoles.length === 0) {
      throw new Error('User does not have any roles assigned');
    }

    const hasSuperAdminRole = userRoles.some(r => r.role === 'super_admin');
    const hasHrRole = userRoles.some(r => r.role === 'hr');

    if (!hasSuperAdminRole && !hasHrRole) {
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

        if (!hasSuperAdminRole && body.role === 'super_admin') {
          throw new Error('Only Super Admins can assign the Super Admin role');
        }

        if (hasHrRole && !hasSuperAdminRole && !['employee', 'hr', 'manager'].includes(body.role)) {
          throw new Error('HR users can only assign Employee, HR, or Manager roles');
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
              let foundUser = null;
              try {
                let page = 1;
                const perPage = 1000;
                let totalSearched = 0;
                const maxUsers = 100000;

                while (!foundUser && totalSearched < maxUsers) {
                  const { data: listResult, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                    page,
                    perPage
                  });

                  if (listError) {
                    console.error('Error listing users:', listError);
                    throw listError;
                  }

                  const users = listResult?.users || [];
                  foundUser = users.find(u => u.email?.toLowerCase() === body.email?.toLowerCase());

                  if (foundUser) break;
                  if (users.length < perPage) break;

                  totalSearched += users.length;
                  page++;
                }
              } catch (searchError) {
                console.error('Error searching for user:', searchError);
                throw searchError;
              }

              if (!foundUser) throw new Error('User email already exists but could not be found. The email may be used by another system user.');
              userId = foundUser.id;
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

        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            company_id: body.companyId,
            employee_id: body.employeeId || null,
            role: body.role,
          });

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ success: true, user_id: userId }),
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

        const userEmails: { [key: string]: string } = {};

        await Promise.all(
          body.userIds.map(async (userId) => {
            try {
              const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
              if (!userError && userData?.user?.email) {
                userEmails[userId] = userData.user.email;
              }
            } catch (err) {
              console.error(`Error fetching user ${userId}:`, err);
            }
          })
        );

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
                const { data: existingUserRole } = await supabaseAdmin
                  .from('user_roles')
                  .select('user_id')
                  .eq('employee_id', employee.id)
                  .eq('company_id', employee.company_id)
                  .maybeSingle();

                if (existingUserRole) {
                  results.skipped.push({
                    employee_number: employee.employee_number,
                    name: `${employee.first_name_en} ${employee.last_name_en}`,
                    reason: 'User account already exists for this employee and company'
                  });
                  continue;
                }

                let foundUser = null;
                try {
                  let page = 1;
                  const perPage = 1000;
                  let totalSearched = 0;
                  const maxUsers = 100000;

                  while (!foundUser && totalSearched < maxUsers) {
                    const { data: listResult, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                      page,
                      perPage
                    });

                    if (listError) {
                      console.error('Error listing users:', listError);
                      break;
                    }

                    const users = listResult?.users || [];
                    foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

                    if (foundUser) break;
                    if (users.length < perPage) break;

                    totalSearched += users.length;
                    page++;
                  }
                } catch (searchError) {
                  console.error('Error searching for user:', searchError);
                }

                if (!foundUser) {
                  results.skipped.push({
                    employee_number: employee.employee_number,
                    name: `${employee.first_name_en} ${employee.last_name_en}`,
                    reason: 'User email already exists but is used by another account'
                  });
                  continue;
                }
                userId = foundUser.id;
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

      case 'update_role': {
        if (!body.roleId || !body.role) {
          throw new Error('Role ID and new role are required');
        }

        if (!hasSuperAdminRole && body.role === 'super_admin') {
          throw new Error('Only Super Admins can assign the Super Admin role');
        }

        if (hasHrRole && !hasSuperAdminRole && !['employee', 'hr', 'manager'].includes(body.role)) {
          throw new Error('HR users can only assign Employee, HR, or Manager roles');
        }

        const { data: existingRole, error: fetchError } = await supabaseAdmin
          .from('user_roles')
          .select('id, role')
          .eq('id', body.roleId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existingRole) throw new Error('Role not found');

        if (existingRole.role === 'super_admin' && !hasSuperAdminRole) {
          throw new Error('Only Super Admins can modify Super Admin roles');
        }

        const { error: updateError } = await supabaseAdmin
          .from('user_roles')
          .update({
            employee_id: body.employeeId !== undefined ? (body.employeeId || null) : undefined,
            role: body.role,
          })
          .eq('id', body.roleId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
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
    console.error('Error:', error);
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