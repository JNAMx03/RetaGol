import { createContext, useContext, useState } from 'react';

const AppContext = createContext<any>(null);

export function AppProvider({ children }: any) {

  const [predictions, setPredictions] = useState([]);

  return (
    <AppContext.Provider value={{ predictions, setPredictions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}