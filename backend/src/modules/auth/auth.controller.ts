import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import type { UserPrincipal } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// cookie-parser types `Request.cookies` as `any`; narrow it here instead of
// letting that `any` leak into every handler that reads a cookie.
type RequestWithCookies = Omit<Request, 'cookies'> & {
  cookies: Record<string, string | undefined>;
};

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, refreshToken } = await this.authService.login(loginDto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    // The access token lives only in the HttpOnly cookie above — returning it
    // in the JSON body would let any JS (including an XSS payload) read it,
    // defeating the point of HttpOnly. JwtStrategy authenticates from the
    // cookie already (see jwtFromCookieOrHeader), so nothing needs it here.
    return { message: 'Đăng nhập thành công' };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = (req as RequestWithCookies).cookies?.refresh_token;
    if (!oldRefreshToken) {
      res.clearCookie('access_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/api/auth' });
      throw new UnauthorizedException('Không có refresh token được cung cấp');
    }

    const { accessToken, refreshToken } =
      await this.authService.refresh(oldRefreshToken);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    // Same rationale as login(): the new access token is only ever set as an
    // HttpOnly cookie, never exposed in the response body.
    return { message: 'Đã làm mới token' };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.revokeByRawToken(
      (req as RequestWithCookies).cookies?.refresh_token,
    );

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });

    return { message: 'Đăng xuất thành công' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: Request) {
    const principal = (req as Request & { user: UserPrincipal }).user;
    const user = await this.userService.findById(principal.id);
    return {
      id: user!.id,
      userName: user!.userName,
      email: user!.email,
      birthDate: user!.birthDate,
      phoneNumber: user!.phoneNumber,
      role: user!.role,
      emailVerified: user!.emailVerified,
      createdAt: user!.createdAt,
    };
  }

  @Post('signup')
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('send-otp')
  sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
