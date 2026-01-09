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

    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin/super_admin/hr role
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

        // Get all user roles for the company
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

        // Get emails for all users
        const userIds = userRoles?.map(r => r.user_id) || [];
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) throw usersError;

        // Map emails to roles and flatten employee data
        const rolesWithEmails = userRoles?.map(role => {
          const user = users.find(u => u.id === role.user_id);
          const employees = role.employees as any;
          return {
            id: role.id,
            user_id: role.user_id,
            employee_id: role.employee_id,
            role: role.role,
            created_at: role.created_at,
            email: user?.email || null,
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

        // Check if user exists
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users.find(u => u.email === body.email);
        let userId: string;
        const defaultPassword = 'TestPass123';

        if (existingUser) {
          userId = existingUser.id;
          // Update password for existing user to ensure they can log in
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: defaultPassword }
          );
          if (updateError) throw updateError;
        } else {
          // Create new user with default password
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: defaultPassword,
            email_confirm: true,
          });

          if (createError) throw createError;
          if (!newUser.user) throw new Error('Failed to create user');

          userId = newUser.user.id;
        }

        // Insert user role using service role (bypasses RLS)
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

        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        if (usersError) throw usersError;

        const userEmails = body.userIds.map(id => {
          const user = users.find(u => u.id === id);
          return { userId: id, email: user?.email || null };
        });

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

        // Get all active employees for the company
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

        console.log(`Found ${employees.length} active employees for company ${body.companyId}`);

        // Get existing user roles for this company to avoid duplicates
        const { data: existingRoles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('employee_id')
          .eq('company_id', body.companyId)
          .not('employee_id', 'is', null);

        if (rolesError) {
          console.error('Error fetching existing roles:', rolesError);
        }

        console.log(`Found ${existingRoles?.length || 0} existing user roles`);
        const existingEmployeeIds = new Set(existingRoles?.map(r => r.employee_id) || []);

        // Get all existing users to check for duplicates
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const results = {
          created: [] as any[],
          skipped: [] as any[],
          failed: [] as any[],
        };

        // Create accounts for employees without existing user roles
        for (const employee of employees) {
          // Skip if employee already has a user role for THIS company
          if (existingEmployeeIds.has(employee.id)) {
            console.log(`Skipping ${employee.employee_number} - already has account for this company`);
            results.skipped.push({
              employee_number: employee.employee_number,
              name: `${employee.first_name_en} ${employee.last_name_en}`,
              reason: 'Already has user account for this company'
            });
            continue;
          }

          console.log(`Creating account for ${employee.employee_number}`);

          try {
            // Create email using employee_number
            const email = `${employee.employee_number}@temp.local`;

            // Check if user with this email already exists
            const existingUser = users.find(u => u.email === email);
            let userId: string;

            if (existingUser) {
              userId = existingUser.id;
              console.log(`User with email ${email} already exists, checking for existing role in this company`);

              // Double-check if this user already has a role for this company
              const { data: existingCompanyRole } = await supabaseAdmin
                .from('user_roles')
                .select('id')
                .eq('user_id', userId)
                .eq('company_id', employee.company_id)
                .eq('employee_id', employee.id)
                .maybeSingle();

              if (existingCompanyRole) {
                console.log(`User ${email} already has a role for this company, skipping`);
                results.skipped.push({
                  employee_number: employee.employee_number,
                  name: `${employee.first_name_en} ${employee.last_name_en}`,
                  reason: 'User already has role for this company'
                });
                continue;
              }

              // User exists but doesn't have a role for this company, so add one
              console.log(`User ${email} exists but has no role for this company, adding role`);
            } else {
              // Try to create new user
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: 'Test123',
                email_confirm: true,
              });

              // If user already exists (not in our paginated list), fetch them
              if (createError && createError.message.includes('already been registered')) {
                console.log(`User ${email} exists but wasn't in paginated list, fetching by email`);

                // Get all users with pagination to find this specific user
                let page = 1;
                let foundUser = null;
                while (!foundUser && page < 100) {
                  const { data: { users: pageUsers } } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
                  foundUser = pageUsers.find(u => u.email === email);
                  if (!foundUser) page++;
                  else break;
                }

                if (!foundUser) {
                  results.failed.push({
                    employee_number: employee.employee_number,
                    name: `${employee.first_name_en} ${employee.last_name_en}`,
                    error: 'User exists but could not be found'
                  });
                  continue;
                }

                userId = foundUser.id;

                // Check if this user already has a role for this company
                const { data: existingCompanyRole } = await supabaseAdmin
                  .from('user_roles')
                  .select('id')
                  .eq('user_id', userId)
                  .eq('company_id', employee.company_id)
                  .eq('employee_id', employee.id)
                  .maybeSingle();

                if (existingCompanyRole) {
                  console.log(`User ${email} already has a role for this company, skipping`);
                  results.skipped.push({
                    employee_number: employee.employee_number,
                    name: `${employee.first_name_en} ${employee.last_name_en}`,
                    reason: 'User already has role for this company'
                  });
                  continue;
                }
              } else if (createError) {
                results.failed.push({
                  employee_number: employee.employee_number,
                  name: `${employee.first_name_en} ${employee.last_name_en}`,
                  error: createError.message
                });
                continue;
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
            }

            // Create user role
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