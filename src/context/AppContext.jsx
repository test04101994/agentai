import { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sampleData } from '../data/sampleData';

const AppContext = createContext();

const STORAGE_KEY = 'costAllocationData';

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return null;
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      employees: state.employees,
      costCodes: state.costCodes,
      allocations: state.allocations,
    }));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

const initialState = loadFromStorage() || {
  employees: sampleData.employees,
  costCodes: sampleData.costCodes,
  allocations: sampleData.allocations,
};

function reducer(state, action) {
  switch (action.type) {
    // Employees
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, { id: uuidv4(), ...action.payload }] };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e),
      };
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(e => e.id !== action.payload),
        allocations: state.allocations.filter(a => a.employeeId !== action.payload),
      };

    // Cost Codes
    case 'ADD_COST_CODE':
      return { ...state, costCodes: [...state.costCodes, { id: uuidv4(), ...action.payload }] };
    case 'UPDATE_COST_CODE':
      return {
        ...state,
        costCodes: state.costCodes.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c),
      };
    case 'DELETE_COST_CODE':
      return {
        ...state,
        costCodes: state.costCodes.filter(c => c.id !== action.payload),
        allocations: state.allocations.filter(a => a.costCodeId !== action.payload),
      };

    // Allocations
    case 'ADD_ALLOCATION':
      return { ...state, allocations: [...state.allocations, {
        id: uuidv4(),
        ...action.payload,
        lastModifiedBy: action.payload.lastModifiedBy || 'Unknown',
        lastModifiedAt: new Date().toISOString(),
      }] };
    case 'UPDATE_ALLOCATION':
      return {
        ...state,
        allocations: state.allocations.map(a => a.id === action.payload.id ? {
          ...a,
          ...action.payload,
          lastModifiedBy: action.payload.lastModifiedBy || a.lastModifiedBy || 'Unknown',
          lastModifiedAt: new Date().toISOString(),
        } : a),
      };
    case 'DELETE_ALLOCATION':
      return { ...state, allocations: state.allocations.filter(a => a.id !== action.payload) };

    // Bulk import
    case 'IMPORT_DATA':
      return {
        ...state,
        employees: action.payload.employees || state.employees,
        costCodes: action.payload.costCodes || state.costCodes,
        allocations: action.payload.allocations || state.allocations,
      };

    case 'RESET_DATA':
      return {
        employees: sampleData.employees,
        costCodes: sampleData.costCodes,
        allocations: sampleData.allocations,
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
