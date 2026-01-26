/**
 * MemberFilters Component
 * 
 * Filter component for member list with search and dropdown filters.
 * Implements debounced search and responsive design.
 * 
 * Requirements:
 * - Req 2.1: Search by nome, cognome, or codiceFiscale
 * - Req 2.2: Filter by socioAttivo
 * - Req 2.3: Filter by stato
 * - Req 12.4: Collapsible filters on mobile
 */

import { useState, useEffect, useCallback } from 'react';
import type { MemberStatus } from '../../types';

export interface MemberFiltersState {
  search: string;
  socioAttivo: boolean | undefined;
  stato: MemberStatus | undefined;
}

interface MemberFiltersProps {
  /** Current filter values */
  filters: MemberFiltersState;
  /** Callback when filters change */
  onFiltersChange: (filters: MemberFiltersState) => void;
  /** Total count of results */
  totalCount?: number;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Custom hook for debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * MemberFilters - Search and filter controls for member list
 */
export function MemberFilters({
  filters,
  onFiltersChange,
  totalCount,
  isLoading,
}: MemberFiltersProps) {
  // Local state for search input (for debouncing)
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Mobile filter panel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Update filters when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch, filters, onFiltersChange]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  // Handle socioAttivo filter change
  const handleSocioAttivoChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let socioAttivo: boolean | undefined;
    if (value === 'true') socioAttivo = true;
    else if (value === 'false') socioAttivo = false;
    else socioAttivo = undefined;
    
    onFiltersChange({ ...filters, socioAttivo });
  }, [filters, onFiltersChange]);

  // Handle stato filter change
  const handleStatoChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as MemberStatus | '';
    onFiltersChange({ ...filters, stato: value || undefined });
  }, [filters, onFiltersChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({ search: '', socioAttivo: undefined, stato: undefined });
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters = filters.search || filters.socioAttivo !== undefined || filters.stato !== undefined;

  // Count active filters (excluding search)
  const activeFilterCount = [
    filters.socioAttivo !== undefined,
    filters.stato !== undefined,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Search bar - always visible */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Cerca per nome, cognome o CF..."
            value={searchInput}
            onChange={handleSearchChange}
            className="input pl-10"
            aria-label="Cerca soci"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                onFiltersChange({ ...filters, search: '' });
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label="Cancella ricerca"
            >
              <svg className="h-5 w-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile filter toggle button */}
        <button
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className="md:hidden btn-secondary flex items-center gap-1 relative"
          aria-expanded={isFilterPanelOpen}
          aria-label="Mostra filtri"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="sr-only md:not-sr-only">Filtri</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop filters - always visible on md+ */}
      <div className="hidden md:flex items-center gap-4">
        {/* SocioAttivo filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="socioAttivo-filter" className="text-sm font-medium text-slate-700 whitespace-nowrap">
            Tipo:
          </label>
          <select
            id="socioAttivo-filter"
            value={filters.socioAttivo === undefined ? '' : String(filters.socioAttivo)}
            onChange={handleSocioAttivoChange}
            className="input py-1.5 w-auto"
          >
            <option value="">Tutti</option>
            <option value="true">Soci Attivi</option>
            <option value="false">Simpatizzanti</option>
          </select>
        </div>

        {/* Stato filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="stato-filter" className="text-sm font-medium text-slate-700 whitespace-nowrap">
            Stato:
          </label>
          <select
            id="stato-filter"
            value={filters.stato || ''}
            onChange={handleStatoChange}
            className="input py-1.5 w-auto"
          >
            <option value="">Tutti</option>
            <option value="attivo">Attivo</option>
            <option value="sospeso">Sospeso</option>
            <option value="dimesso">Dimesso</option>
          </select>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Cancella filtri
          </button>
        )}

        {/* Results count */}
        <div className="ml-auto text-sm text-slate-500">
          {isLoading ? (
            <span className="animate-pulse">Caricamento...</span>
          ) : totalCount !== undefined ? (
            <span>{totalCount} {totalCount === 1 ? 'risultato' : 'risultati'}</span>
          ) : null}
        </div>
      </div>

      {/* Mobile filter panel - collapsible */}
      {isFilterPanelOpen && (
        <div className="md:hidden card space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900">Filtri</h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Cancella tutti
              </button>
            )}
          </div>

          {/* SocioAttivo filter */}
          <div>
            <label htmlFor="socioAttivo-filter-mobile" className="label">
              Tipo Socio
            </label>
            <select
              id="socioAttivo-filter-mobile"
              value={filters.socioAttivo === undefined ? '' : String(filters.socioAttivo)}
              onChange={handleSocioAttivoChange}
              className="input"
            >
              <option value="">Tutti</option>
              <option value="true">Soci Attivi</option>
              <option value="false">Simpatizzanti</option>
            </select>
          </div>

          {/* Stato filter */}
          <div>
            <label htmlFor="stato-filter-mobile" className="label">
              Stato
            </label>
            <select
              id="stato-filter-mobile"
              value={filters.stato || ''}
              onChange={handleStatoChange}
              className="input"
            >
              <option value="">Tutti</option>
              <option value="attivo">Attivo</option>
              <option value="sospeso">Sospeso</option>
              <option value="dimesso">Dimesso</option>
            </select>
          </div>

          {/* Apply button */}
          <button
            onClick={() => setIsFilterPanelOpen(false)}
            className="btn-primary w-full"
          >
            Applica Filtri
          </button>
        </div>
      )}

      {/* Mobile results count */}
      <div className="md:hidden text-sm text-slate-500">
        {isLoading ? (
          <span className="animate-pulse">Caricamento...</span>
        ) : totalCount !== undefined ? (
          <span>{totalCount} {totalCount === 1 ? 'risultato' : 'risultati'}</span>
        ) : null}
      </div>
    </div>
  );
}

export default MemberFilters;
