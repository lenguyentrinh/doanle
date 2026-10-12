import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserPrincipal } from '../../modules/auth/strategies/jwt.strategy';

/**
 * Extract the current user principal from the request.
 * Must be used on endpoints protected by AuthGuard('jwt').
 *
 * Usage:
 *   getCart(@CurrentUser() user: UserPrincipal) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPrincipal => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { user: UserPrincipal }).user;
  },
);
