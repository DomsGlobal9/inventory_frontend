import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, LOCATION_STORAGE_KEY } from '../lib/api';
import toast from 'react-hot-toast';

export interface Location {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

interface LocationContextType {
  locations: Location[];
  currentLocation: Location | null;
  setCurrentLocationId: (id: string) => void;
  isLoading: boolean;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocationId, setCurrentLocationIdState] = useState<string | null>(
    localStorage.getItem(LOCATION_STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const data = (await api.get('/locations')) as any as Location[];
      setLocations(data);
      
      // If we don't have a current location, or the stored one is no longer valid, default to the first one (MAIN-STORE if available)
      if (data.length > 0) {
        let validLocation = data.find((l: Location) => l.id === currentLocationId);
        if (!validLocation) {
          validLocation = data.find((l: Location) => l.code === 'MAIN-STORE') || data[0];
          setCurrentLocationId(validLocation.id);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrentLocationId = (id: string) => {
    setCurrentLocationIdState(id);
    localStorage.setItem(LOCATION_STORAGE_KEY, id);
    // When location changes, we typically want the app to re-fetch data for the new location.
    // The easiest way to ensure all components refresh is to reload the window, 
    // or rely on React Query / Context to trigger updates if components are wired up properly.
    // Let's rely on React state updates for now. 
    // However, some components might not auto-refresh. A full page reload is safest if components are deeply nested and rely on mount-time fetch.
    window.location.reload(); 
  };

  const currentLocation = locations.find(l => l.id === currentLocationId) || null;

  return (
    <LocationContext.Provider value={{ locations, currentLocation, setCurrentLocationId, isLoading, refreshLocations: fetchLocations }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};
