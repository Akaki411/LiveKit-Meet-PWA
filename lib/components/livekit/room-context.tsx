'use client';

import * as React from 'react';
import type { Room } from 'livekit-client';

const RoomContext = React.createContext<Room | undefined>(undefined);

export const RoomContextProvider = ({
  room,
  children,
}: {
  room: Room;
  children: React.ReactNode;
}) => <RoomContext.Provider value={room}>{children}</RoomContext.Provider>;

export const useRoomContext = (): Room => {
  const room = React.useContext(RoomContext);
  if (!room) {
    throw new Error('useRoomContext must be used within a RoomContextProvider');
  }
  return room;
};

export const useMaybeRoomContext = (): Room | undefined => React.useContext(RoomContext);
