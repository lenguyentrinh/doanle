import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtFromRequestFunction } from 'passport-jwt';
import { Strategy } from 'passport-jwt';
import { UserService } from '../../users/user.service';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../users/entities/user-role.enum';

interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

export interface UserPrincipal {
  id: number;
  email: string;
  role: UserRole;
}

const jwtFromHeader: JwtFromRequestFunction = (req: Request | undefined) => {
  if (!req) return null;

  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') {
    return null;
  }

  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

// cookie-parser types `Request.cookies` as `any`; narrow it here instead of
// letting that `any` leak into the extractor's return value.
type RequestWithCookies = Omit<Request, 'cookies'> & {
  cookies: Record<string, string | undefined>;
};

const jwtFromCookieOrHeader: JwtFromRequestFunction = (
  req: Request | undefined,
) => {
  if (!req) return null;

  const cookieToken = (req as RequestWithCookies).cookies?.access_token;
  if (cookieToken) return cookieToken;

  return jwtFromHeader(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UserService,
    private readonly configService: ConfigService,
  ) {
    // ExtractJwt typings are too loose for our eslint setup, so we use a custom extractor instead.
    const options: {
      jwtFromRequest: JwtFromRequestFunction;
      ignoreExpiration: boolean;
      secretOrKey: string;
    } = {
      jwtFromRequest: jwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') as string,
    };

    super(options);
  }

  async validate(payload: JwtPayload): Promise<UserPrincipal> {
    // Verify user exists in database
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    // Return only safe fields, never expose password hash or OTP
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
