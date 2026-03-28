import { createContext, useContext, useEffect, useState } from 'react';

const SelectedUserContext = createContext(null);

export function SelectedUserProvider({ children }) {
  const [selectedUserId, setSelectedUserId] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const storedId = localStorage.getItem('selectedUserId');
    return storedId ? parseInt(storedId, 10) : null;
  });

  useEffect(() => {
    if (selectedUserId !== null && selectedUserId !== undefined) {
      localStorage.setItem('selectedUserId', selectedUserId);
    } else {
      localStorage.removeItem('selectedUserId');
    }
  }, [selectedUserId]);

  const clearSelectedUser = () => {
    setSelectedUserId(null);
  };

  return (
    <SelectedUserContext.Provider value={{ selectedUserId, setSelectedUserId, clearSelectedUser }}>
      {children}
    </SelectedUserContext.Provider>
  );
}

export function useSelectedUser() {
  const context = useContext(SelectedUserContext);
  if (!context) {
    throw new Error('useSelectedUser must be used within SelectedUserProvider');
  }
  return context;
}
