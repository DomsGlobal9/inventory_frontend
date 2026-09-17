import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, LOCATION_STORAGE_KEY } from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useUnsavedWorkRegistry } from './UnsavedWorkContext';

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
  // A store change waiting on an answer, because a screen is holding work.
  const [pending, setPending] = useState<{ id: string; work: string } | null>(null);
  const unsavedWork = useUnsavedWorkRegistry();

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

  /**
   * Changing the store starts the app again on the new store.
   *
   * The reload is deliberate: stock, shelves, orders and prices all belong to one store, and
   * every screen -- including ones that read the store only when they open -- must show the new
   * one. Refreshing each query by hand would leave whichever screen was forgotten showing the
   * old store's numbers, which is the worst outcome of the three.
   *
   * What it must not do is throw away work without asking. A screen holding a half-typed count
   * sheet or a half-ticked pick walk says so, and then the person decides.
   */
  const applySwitch = (id: string) => {
    setCurrentLocationIdState(id);
    localStorage.setItem(LOCATION_STORAGE_KEY, id);
    window.location.reload();
  };

  const setCurrentLocationId = (id: string) => {
    if (id === currentLocationId) return;
    const work = unsavedWork.inHand();
    if (work) { setPending({ id, work }); return; }
    applySwitch(id);
  };

  const currentLocation = locations.find(l => l.id === currentLocationId) || null;
  const goingTo = locations.find(l => l.id === pending?.id);

  return (
    <LocationContext.Provider value={{ locations, currentLocation, setCurrentLocationId, isLoading, refreshLocations: fetchLocations }}>
      {children}
      <ConfirmModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => { const id = pending!.id; setPending(null); applySwitch(id); }}
        title={`Change to ${goingTo?.name ?? 'the other store'}?`}
        message={`${currentLocation?.name ?? 'This store'} has ${pending?.work} on screen. Changing the store starts again in ${goingTo?.name ?? 'the other store'}, and that work is lost.`}
        confirmText="Change store"
        confirmStyle="danger"
      />
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
