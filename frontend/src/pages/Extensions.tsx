/**
 * Extensions Page - VibeBox Frontend
 * Browse and search VS Code extensions
 */

import React, { useState, useCallback } from 'react';
import { Box, Typography, Grid, Pagination } from '@mui/material';
import { extensionsApi } from '@/services/api';
import type { ExtensionSearchResult } from '@/types';
import { LoadingSpinner, EmptyState } from '@/components/common';
import {
  ExtensionCard,
  ExtensionSearchBar,
  EnvironmentSelectorDialog,
} from '@/components/extensions';
import { useNotification } from '@/contexts/NotificationContext';
import { useDebounce, usePagination } from '@/hooks';

/**
 * Extensions marketplace page
 */
export function Extensions(): JSX.Element {
  const notification = useNotification();
  const [extensions, setExtensions] = useState<ExtensionSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<ExtensionSearchResult | null>(null);
  const [installing, setInstalling] = useState(false);
  const { page, pageSize, totalPages, setPage, setTotalPages } = usePagination({
    initialPageSize: 12,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const searchExtensions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await extensionsApi.searchExtensions({
        query: debouncedSearch,
        page,
        pageSize,
      });
      setExtensions(result.data);
      setTotalPages(result.meta.totalPages);
    } catch (error) {
      notification.error('Failed to search extensions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, notification, setTotalPages]);

  React.useEffect(() => {
    if (debouncedSearch) {
      searchExtensions();
    } else {
      setExtensions([]);
    }
  }, [debouncedSearch, searchExtensions]);

  /**
   * Handle extension install button click
   * Opens the environment selector dialog
   */
  const handleInstall = useCallback((extension: ExtensionSearchResult) => {
    setSelectedExtension(extension);
    setSelectorOpen(true);
  }, []);

  /**
   * Handle environment selection from dialog
   * Installs the extension in the selected environment
   */
  const handleEnvironmentSelect = useCallback(
    async (environmentId: string) => {
      if (!selectedExtension) return;

      setInstalling(true);
      setSelectorOpen(false);

      try {
        await extensionsApi.installExtension({
          environmentId,
          extensionId: selectedExtension.extensionId,
          version: selectedExtension.version,
        });
        notification.success(`${selectedExtension.displayName} installed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to install extension';
        notification.error(errorMessage);
        console.error(error);
      } finally {
        setInstalling(false);
        setSelectedExtension(null);
      }
    },
    [selectedExtension, notification]
  );

  /**
   * Handle cancellation of environment selector
   */
  const handleCancelSelector = useCallback(() => {
    setSelectorOpen(false);
    setSelectedExtension(null);
  }, []);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Extensions
      </Typography>

      <Box sx={{ mb: 3 }}>
        <ExtensionSearchBar value={searchQuery} onChange={setSearchQuery} />
      </Box>

      {loading || installing ? (
        <LoadingSpinner
          message={installing ? 'Installing extension...' : 'Searching extensions...'}
        />
      ) : extensions.length === 0 && !searchQuery ? (
        <EmptyState
          title="Search for extensions"
          description="Find and install VS Code extensions for your development environments"
        />
      ) : extensions.length === 0 ? (
        <EmptyState title="No extensions found" description="Try a different search query" />
      ) : (
        <>
          <Grid container spacing={3}>
            {extensions.map((extension) => (
              <Grid item xs={12} md={6} key={extension.extensionId}>
                <ExtensionCard extension={extension} onInstall={handleInstall} />
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Environment selector dialog */}
      <EnvironmentSelectorDialog
        open={selectorOpen}
        extensionName={selectedExtension?.displayName || ''}
        onSelect={handleEnvironmentSelect}
        onCancel={handleCancelSelector}
      />
    </Box>
  );
}
