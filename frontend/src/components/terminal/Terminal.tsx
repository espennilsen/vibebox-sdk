/**
 * Terminal Component - VibeBox Frontend
 * xterm.js terminal with WebSocket integration
 */

import React, { useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { getWebSocketClient } from '@/services/websocket';
import type { TerminalDataPayload, TerminalResizePayload } from '@/types';

interface TerminalProps {
  sessionId: string;
  onClose?: () => void;
}

/**
 * Terminal component with xterm.js and WebSocket
 */
export function Terminal({ sessionId, onClose }: TerminalProps): JSX.Element {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // Open terminal
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Setup WebSocket
    const ws = getWebSocketClient();

    // Connect if not already connected
    if (!ws.isConnected()) {
      ws.connect();
    }

    // Send data to WebSocket when user types
    const disposable = xterm.onData((data) => {
      ws.send('terminal:data', {
        sessionId,
        data,
      } as TerminalDataPayload);
    });

    // Receive data from WebSocket
    const unsubscribe = ws.on<TerminalDataPayload>('terminal:data', (payload) => {
      if (payload.sessionId === sessionId) {
        xterm.write(payload.data);
      }
    });

    // Handle session closed
    const unsubscribeClose = ws.on<{ sessionId: string }>('session:closed', (payload) => {
      if (payload.sessionId === sessionId) {
        xterm.writeln('\r\n\r\n[Session closed]');
        xterm.options.disableStdin = true;
        if (onClose) {
          setTimeout(onClose, 2000);
        }
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      ws.send('terminal:resize', {
        sessionId,
        cols: xterm.cols,
        rows: xterm.rows,
      } as TerminalResizePayload);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      disposable.dispose();
      unsubscribe();
      unsubscribeClose();
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [sessionId, onClose]);

  // Fit terminal when container size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Paper
      sx={{
        height: '100%',
        minHeight: '400px',
        bgcolor: '#1e1e1e',
        p: 1,
      }}
    >
      <Box
        ref={terminalRef}
        sx={{
          height: '100%',
          '& .xterm': {
            height: '100%',
          },
        }}
      />
    </Paper>
  );
}
