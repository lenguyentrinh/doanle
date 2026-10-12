export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET_KEY,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  jwtRefresh: {
    // Refresh tokens are opaque bcrypt-hashed secrets, not JWTs — there is
    // no signing secret to configure, only their lifetime.
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
});
