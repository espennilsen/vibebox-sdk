/**
 * Extensions Page - VibeBox Frontend
 * Browse and search VS Code extensions
 */

import React, { useState } from 'react';
import { Box, Typography, Grid, Pagination } from '@mui/material';
import { extensionsApi } from '@/services/api';
import type { ExtensionSearchResult } from '@/types';
import { LoadingSpinner, EmptyState } from '@/components/common';
import { ExtensionCard, ExtensionSearchBar } from '@/components/extensions';
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
  const { page, pageSize, totalPages, setPage, setTotalPages } = usePagination({
    initialPageSize: 12,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  React.useEffect(() => {
    if (debouncedSearch) {
      searchExtensions();
    } else {
      setExtensions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  const searchExtensions = async () => {
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
  };

  const handleInstall = async (_extension: ExtensionSearchResult) => {
    notification.info('Extension installation requires an active environment');
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Extensions
      </Typography>

      <Box sx={{ mb: 3 }}>
        <ExtensionSearchBar value={searchQuery} onChange={setSearchQuery} />
      </Box>

      {loading ? (
        <LoadingSpinner message="Searching extensions..." />
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
    </Box>
  );
}
