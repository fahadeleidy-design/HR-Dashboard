import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  action: 'list_users' | 'create_user' | 'get_user_email';
  email?: string;
  companyId?: string;
  userIds?: string[];
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

    // Check if user has admin/super_admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || !['super_admin', 'admin'].includes(userRole.role)) {
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
        if (!body.email || !body.companyId) {
          throw new Error('Email and company ID are required');
        }

        // Check if user exists
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users.find(u => u.email === body.email);
        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user with temporary password
          const tempPassword = crypto.randomUUID() + 'A1!';
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: tempPassword,
            email_confirm: true,
          });

          if (createError) throw createError;
          if (!newUser.user) throw new Error('Failed to create user');

          userId = newUser.user.id;
        }

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
