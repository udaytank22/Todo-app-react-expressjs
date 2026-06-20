const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Register a new user
 */
const register = async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields (email, password, name) are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    // Check if this is the first user in the system (if so, make them ADMIN)
    const userCount = await prisma.user.count();
    let assignedRole = userCount === 0 ? 'ADMIN' : (role || 'STAFF').toUpperCase();

    // Validate role
    if (!['ADMIN', 'MANAGER', 'STAFF'].includes(assignedRole)) {
      assignedRole = 'STAFF';
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: assignedRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      user: newUser,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during user registration.' });
  }
};

/**
 * Login a user
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Create access token (expires in 15 minutes)
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Create secure refresh token (expires in 7 days)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token to database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    return res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during user login.' });
  }
};

/**
 * Get current user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Server error fetching user profile.' });
  }
};

/**
 * Get all users in the system (for task assignment)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Server error fetching users.' });
  }
};

/**
 * Refresh Access Token
 */
const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    // Find refresh token in DB
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: true,
      },
    });

    // Check if token exists
    if (!dbToken) {
      return res.status(401).json({ error: 'invalid_refresh_token', message: 'Refresh token not found.' });
    }

    // Check if token has expired
    if (dbToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
      return res.status(401).json({ error: 'expired_refresh_token', message: 'Refresh token has expired.' });
    }

    const { user } = dbToken;

    // Generate new access token (expires in 15m)
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: newRefreshTokenExpiry,
        },
      }),
    ]);

    return res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Server error during token refresh.' });
  }
};

/**
 * Logout and invalidate refresh token
 */
const logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    }).catch(() => {});

    return res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Server error during user logout.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  refresh,
  logout,
};
