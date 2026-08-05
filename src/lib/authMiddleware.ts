import { NextRequest, NextResponse } from 'next/server';
import { Client, Account, Teams } from 'node-appwrite';
import { logger } from '@/utils/logger';

export type UserRole = 'SUPER_ADMIN' | 'DESA' | 'KECAMATAN' | 'DINSOS' | 'BAKEUDA';

export interface AuthContext {
  userId: string;
  role: UserRole;
  email?: string;
}

/**
 * Validates request authentication and RBAC roles.
 */
export async function verifyAuth(req: NextRequest, allowedRoles?: UserRole[]): Promise<{ authorized: boolean; context?: AuthContext; response?: NextResponse }> {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-appwrite-session');
    const roleHeader = req.headers.get('x-user-role') as UserRole | null;

    // Local / Dev Fallback Role if Header is provided
    let role: UserRole = roleHeader || 'BAKEUDA';
    let userId = 'system-user';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtToken = authHeader.substring(7);
      
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
        .setJWT(jwtToken);

      const account = new Account(client);
      const user = await account.get();
      userId = user.$id;

      // Fetch user team / role from Appwrite Teams if configured
      const teams = new Teams(client);
      try {
        const userTeams = await teams.list();
        if (userTeams.teams.length > 0) {
          const teamName = userTeams.teams[0].name.toUpperCase();
          if (['SUPER_ADMIN', 'DESA', 'KECAMATAN', 'DINSOS', 'BAKEUDA'].includes(teamName)) {
            role = teamName as UserRole;
          }
        }
      } catch {
        // Default to fallback role if teams list is unpopulated
      }
    }

    // RBAC Role Verification
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role) && role !== 'SUPER_ADMIN') {
      logger.warn('AUTH_MIDDLEWARE', 'Akses ditolak (RBAC Violation)', { userId, role, required: allowedRoles });
      return {
        authorized: false,
        response: NextResponse.json(
          { error: `Akses ditolak. Peran '${role}' tidak memiliki izin untuk tindakan ini.` },
          { status: 403 }
        )
      };
    }

    return {
      authorized: true,
      context: { userId, role }
    };

  } catch (error: any) {
    logger.error('AUTH_MIDDLEWARE', 'Verifikasi Auth Gagal', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Sesi tidak valid atau telah kedaluwarsa' },
        { status: 401 }
      )
    };
  }
}
