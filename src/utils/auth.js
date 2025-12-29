// Authentication utilities using localStorage (can be upgraded to backend later)

export const authService = {
  // Sign up new user
  signup: (email, password, name) => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      
      if (users[email]) {
        throw new Error('User already exists');
      }

      // Create user object
      const user = {
        email,
        password, // In production, this should be hashed
        name,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        subscription: {
          plan: 'free',
          status: 'active',
          usageCount: 0,
          limit: 3, // Free tier: 3 documents
          expiresAt: null
        }
      };

      users[email] = user;
      localStorage.setItem('users', JSON.stringify(users));
      
      // Auto-login after signup
      localStorage.setItem('currentUser', JSON.stringify({ email, name: user.name, id: user.id }));
      
      return { success: true, user: { email, name: user.name, id: user.id, subscription: user.subscription } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Login user
  login: (email, password) => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      const user = users[email];

      if (!user) {
        throw new Error('User not found');
      }

      if (user.password !== password) {
        throw new Error('Invalid password');
      }

      // Set current user session
      localStorage.setItem('currentUser', JSON.stringify({ 
        email, 
        name: user.name, 
        id: user.id,
        subscription: user.subscription 
      }));

      return { 
        success: true, 
        user: { 
          email, 
          name: user.name, 
          id: user.id,
          subscription: user.subscription 
        } 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('currentUser');
  },

  // Check if user has active subscription
  hasActiveSubscription: () => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const fullUser = users[user.email];
    if (!fullUser) return false;

    return fullUser.subscription?.plan === 'premium' && 
           fullUser.subscription?.status === 'active';
  },

  // Get user's usage count
  getUsageCount: () => {
    const user = authService.getCurrentUser();
    if (!user) return 0;
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const fullUser = users[user.email];
    return fullUser?.subscription?.usageCount || 0;
  },

  // Check if user can use the service
  canUseService: () => {
    const user = authService.getCurrentUser();
    if (!user) return { allowed: false, reason: 'Please login first' };
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const fullUser = users[user.email];
    if (!fullUser) return { allowed: false, reason: 'User not found' };

    // Premium users have unlimited access
    if (fullUser.subscription?.plan === 'premium' && 
        fullUser.subscription?.status === 'active') {
      return { allowed: true };
    }

    // Free tier: check usage limit
    const usageCount = fullUser.subscription?.usageCount || 0;
    const limit = fullUser.subscription?.limit || 3;
    
    if (usageCount >= limit) {
      return { 
        allowed: false, 
        reason: `You've reached your free limit of ${limit} documents. Upgrade to Premium for unlimited access.` 
      };
    }

    return { allowed: true };
  },

  // Increment usage count
  incrementUsage: () => {
    const user = authService.getCurrentUser();
    if (!user) return;
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const fullUser = users[user.email];
    if (!fullUser) return;

    // Don't increment for premium users (unlimited)
    if (fullUser.subscription?.plan === 'premium') return;

    fullUser.subscription.usageCount = (fullUser.subscription.usageCount || 0) + 1;
    users[user.email] = fullUser;
    localStorage.setItem('users', JSON.stringify(users));

    // Update current user session
    const currentUser = { ...user, subscription: fullUser.subscription };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  },

  // Update subscription status (called after payment)
  updateSubscription: (plan = 'premium', status = 'active') => {
    const user = authService.getCurrentUser();
    if (!user) return;

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const fullUser = users[user.email];
    if (!fullUser) return;

    fullUser.subscription = {
      ...fullUser.subscription,
      plan,
      status,
      expiresAt: plan === 'premium' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
    };

    users[user.email] = fullUser;
    localStorage.setItem('users', JSON.stringify(users));

    // Update current user session
    const currentUser = { ...user, subscription: fullUser.subscription };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }
};

