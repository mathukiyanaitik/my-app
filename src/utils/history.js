// Document history utilities

export const historyService = {
  // Save document to history
  saveDocument: (documentData) => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (!user) return { success: false, error: 'User not logged in' };

      const historyKey = `history_${user.id}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

      const document = {
        id: Date.now().toString(),
        ...documentData,
        createdAt: new Date().toISOString(),
        userId: user.id
      };

      history.unshift(document); // Add to beginning
      localStorage.setItem(historyKey, JSON.stringify(history));

      return { success: true, document };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get all documents for current user
  getDocuments: () => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (!user) return [];

      const historyKey = `history_${user.id}`;
      return JSON.parse(localStorage.getItem(historyKey) || '[]');
    } catch {
      return [];
    }
  },

  // Get specific document by ID
  getDocument: (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (!user) return null;

      const historyKey = `history_${user.id}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return history.find(doc => doc.id === id) || null;
    } catch {
      return null;
    }
  },

  // Delete document from history
  deleteDocument: (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (!user) return { success: false, error: 'User not logged in' };

      const historyKey = `history_${user.id}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const filtered = history.filter(doc => doc.id !== id);
      localStorage.setItem(historyKey, JSON.stringify(filtered));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

