const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^[6-9]\d{9}$|^$/, 'Please provide a valid 10-digit Indian phone number'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['owner', 'employee'],
      default: 'employee',
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop reference is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  } 
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.refreshToken;
  return user;
};

// Index for text search
userSchema.index({ name: 'text', email: 'text' });

module.exports = mongoose.model('User', userSchema);
