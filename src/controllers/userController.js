/**
 * User Controller - Handle User-related operations
 * VIHI IT Solutions HR System
 */

const User = require('../models/User');
const { generateToken } = require('../utils/jwtUtils');
const asyncHandler = require('../middleware/asyncHandler');

// ============================================
// @desc    Register new user
// @route   POST /api/users/register
// @access  Public (Admin only in production)
// ============================================
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, employeeId, department, position } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  // Check if employee ID already exists
  const employeeExists = await User.findOne({ employeeId });
  if (employeeExists) {
    res.status(400);
    throw new Error('Employee ID already exists');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'employee',
    employeeId,
    department,
    position,
  });

  if (user) {
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        token: generateToken(user._id),
      },
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// ============================================
// @desc    Login user
// @route   POST /api/users/login
// @access  Public
// ============================================
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    res.status(403);
    throw new Error('Your account has been deactivated. Please contact HR.');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicProfile(),
      token: generateToken(user._id),
    },
  });
});

// ============================================
// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
// ============================================
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, department, isActive } = req.query;

  // Build filter object
  const filter = {};
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// ============================================
// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
// ============================================
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// ============================================
// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
// ============================================
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Update fields (excluding password and email)
  const allowedFields = ['name', 'role', 'department', 'position', 'isActive', 'profileImage'];
  
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser.getPublicProfile(),
  });
});

// ============================================
// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
// ============================================
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

// ============================================
// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
// ============================================
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});
