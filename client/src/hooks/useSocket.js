import { useEffect, useRef, useCallback } from 'react';

/**
 * Placeholder socket hook — ready for WebSocket integration.
 * Currently a no-op that can be extended when the backend adds socket support.
 */
const useSocket = (events = {}) => {
  const socketRef = useRef(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const connect = useCallback(() => {
    // Future: connect to socket.io or native WebSocket
    // const socket = io('http://localhost:5000');
    // socketRef.current = socket;
    // Object.entries(eventsRef.current).forEach(([event, handler]) => {
    //   socket.on(event, handler);
    // });
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close?.();
      socketRef.current = null;
    }
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.emit) {
      socketRef.current.emit(event, data);
    }
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect, emit, socket: socketRef.current };
};

export default useSocket;
