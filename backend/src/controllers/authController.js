const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';

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

    // Create JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
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

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
};
