const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { generateAccessToken, generateRefreshToken } = require('./jwt');

/**
 * Hash a token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Handle session creation: Limit max 5 devices
 */
const createSession = async (userId, refreshToken, ip, device) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Check active sessions
  const sessions = await prisma.userSession.findMany({
    where: { userId, isRevoked: false },
    orderBy: { createdAt: 'asc' }
  });

  if (sessions.length >= 5) {
    // Revoke the oldest ones until we have room for 1 more
    const toRevoke = sessions.slice(0, sessions.length - 4);
    for (const session of toRevoke) {
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true }
      });
    }
  }

  // Create new session
  await prisma.userSession.create({
    data: {
      userId,
      tokenHash,
      ip,
      device,
      expiresAt
    }
  });
};

/**
 * Attach cookies to response
 */
const setTokensInCookies = async (res, userId, ip, device) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  await createSession(userId, refreshToken, ip, device);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return { accessToken, refreshToken }; // Return if needed, though they are in cookies now
};

module.exports = { hashToken, createSession, setTokensInCookies };
