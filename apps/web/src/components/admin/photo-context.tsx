'use client';
import { createContext, useContext } from 'react';

export type PendingPhotos = { files: File[]; setFiles: (files: File[]) => void };
export const PendingPhotosContext = createContext<PendingPhotos | null>(null);
export const usePendingPhotos = () => useContext(PendingPhotosContext);
