/**
 * Log Viewer Component - VibeBox Frontend
 * Real-time log streaming with virtual scrolling
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  IconButton,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import { Download, Clear } from '@mui/icons-material';
import { FixedSizeList as List } from 'react-window';
import { logsApi } from '@/services/api';
import { useWebSocket } from '@/hooks';
import type { LogEntry, LogDataPayload } from '@/types';
import { useNotification } from '@/contexts/NotificationContext';

interface LogViewerProps {
  environmentId: string;
}

/**
 * Log viewer with real-time streaming and virtual scrolling
 */
export function LogViewer({ environmentId }: LogViewerProps): JSX.Element {
  const notification = useNotification();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [streamFilter, setStreamFilter] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isStreaming, setIsStreaming] = useState(true);
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    try {
      const data = await logsApi.getLogs({
        environmentId,
        limit: 1000,
      });
      setLogs(data);
    } catch (error) {
      notification.error('Failed to load logs');
      console.error(error);
    }
  }, [environmentId, notification]);

  // Load initial logs
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Subscribe to real-time log updates
  useWebSocket<LogDataPayload>(
    'log:data',
    (payload) => {
      if (payload.environmentId === environmentId && isStreaming) {
        setLogs((prev) => [...prev, payload.entry]);
      }
    },
    [environmentId, isStreaming]
  );

  // Filter logs based on stream and search query
  useEffect(() => {
    let filtered = logs;

    // Apply stream filter
    if (streamFilter !== 'all') {
      filtered = filtered.filter((log) => log.stream === streamFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) => log.message.toLowerCase().includes(query));
    }

    setFilteredLogs(filtered);

    // Auto-scroll to bottom
    if (autoScroll && listRef.current) {
      listRef.current.scrollToItem(filtered.length - 1, 'end');
    }
  }, [logs, streamFilter, searchQuery, autoScroll]);

  const handleClear = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const handleExport = () => {
    const content = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.stream}] ${log.message}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${environmentId}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (stream: string): string => {
    return stream === 'stderr' ? '#f87171' : '#d4d4d4';
  };

  const LogRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const log = filteredLogs[index];
    if (!log) return null;

    return (
      <Box
        style={style}
        sx={{
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          fontSize: '12px',
          color: getLogColor(log.stream),
          px: 2,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box component="span" sx={{ color: 'text.secondary', mr: 2 }}>
          {new Date(log.timestamp).toLocaleTimeString()}
        </Box>
        <Box component="span" sx={{ color: getLogColor(log.stream) }}>
          {log.message}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="Stream"
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value as 'all' | 'stdout' | 'stderr')}
            select
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="stdout">stdout</MenuItem>
            <MenuItem value="stderr">stderr</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            }
            label="Auto-scroll"
          />

          <FormControlLabel
            control={
              <Switch checked={isStreaming} onChange={(e) => setIsStreaming(e.target.checked)} />
            }
            label="Live"
          />

          <Box sx={{ flexGrow: 1 }} />

          <Chip label={`${filteredLogs.length} lines`} size="small" />

          <IconButton onClick={handleClear} size="small" title="Clear logs">
            <Clear />
          </IconButton>

          <IconButton onClick={handleExport} size="small" title="Export logs">
            <Download />
          </IconButton>
        </Box>
      </Paper>

      <Paper
        ref={containerRef}
        sx={{
          flexGrow: 1,
          bgcolor: '#1e1e1e',
          overflow: 'hidden',
        }}
      >
        {filteredLogs.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            No logs to display
          </Box>
        ) : (
          <List
            ref={listRef}
            height={containerRef.current?.clientHeight || 600}
            itemCount={filteredLogs.length}
            itemSize={32}
            width="100%"
          >
            {LogRow}
          </List>
        )}
      </Paper>
    </Box>
  );
}
