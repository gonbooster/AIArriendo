import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { ScrapingJob } from '../types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  scrapingJobs: ScrapingJob[];
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [scrapingJobs, setScrapingJobs] = useState<ScrapingJob[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // Scraping job events
    newSocket.on('scraping:started', (job: ScrapingJob) => {
      console.log('Scraping started:', job);
      setScrapingJobs(prev => {
        const existing = prev.find(j => j.id === job.id);
        if (existing) {
          return prev.map(j => j.id === job.id ? job : j);
        }
        return [...prev, job];
      });

      addNotification({
        type: 'info',
        title: 'Scraping Started',
        message: `Started scraping ${job.source}`,
      });
    });

    newSocket.on('scraping:progress', (data: { jobId: string; progress: number; message?: string }) => {
      console.log('Scraping progress:', data);
      setScrapingJobs(prev =>
        prev.map(job =>
          job.id === data.jobId
            ? { ...job, progress: data.progress }
            : job
        )
      );
    });

    newSocket.on('scraping:completed', (job: ScrapingJob) => {
      console.log('Scraping completed:', job);
      setScrapingJobs(prev =>
        prev.map(j => j.id === job.id ? job : j)
      );

      addNotification({
        type: 'success',
        title: 'Scraping Completed',
        message: `Found ${job.propertiesFound} properties from ${job.source}`,
      });
    });

    newSocket.on('scraping:failed', (job: ScrapingJob) => {
      console.log('Scraping failed:', job);
      setScrapingJobs(prev =>
        prev.map(j => j.id === job.id ? job : j)
      );

      addNotification({
        type: 'error',
        title: 'Scraping Failed',
        message: `Failed to scrape ${job.source}: ${job.error}`,
      });
    });

    // New properties found
    newSocket.on('properties:new', (data: { count: number; source: string }) => {
      addNotification({
        type: 'success',
        title: 'New Properties Found',
        message: `${data.count} new properties found from ${data.source}`,
      });
    });

    // Price alerts
    newSocket.on('alert:price-drop', (data: { propertyId: string; oldPrice: number; newPrice: number }) => {
      addNotification({
        type: 'info',
        title: 'Price Drop Alert',
        message: `Property price dropped from $${data.oldPrice.toLocaleString()} to $${data.newPrice.toLocaleString()}`,
      });
    });

    // System notifications
    newSocket.on('system:notification', (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      addNotification(notification);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only last 50 notifications
  };

  const value: SocketContextType = {
    socket,
    connected,
    scrapingJobs,
    notifications,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
