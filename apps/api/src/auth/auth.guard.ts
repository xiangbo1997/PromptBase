import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';

export interface JwtTokenPayload {
  sub: string;
  email: string;
  displayName?: string | null;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string | null;
}

export type AuthenticatedRequest = FastifyRequest & {
  user: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = this.extractBearerToken(header);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtTokenPayload>(token);

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName ?? null,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractBearerToken(header?: string | string[]): string | null {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) return null;

    const [scheme, token] = value.split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
  }
}
