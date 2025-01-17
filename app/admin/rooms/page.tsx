"use client";

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import AdminNav from '../components/AdminNav';

interface Room {
  id: number;
  name: string;
  squareMeters?: number;
  _count?: {
    products: number;
  };
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [squareMeters, setSquareMeters] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();

      if (Array.isArray(data)) {
        setRooms(data);
      } else {
        console.error('Invalid data format:', data);
        setRooms([]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Erreur lors de la récupération des pièces');
      setRooms([]);
    }
  };

  const handleUpdateSquareMeters = async () => {
    if (!selectedRoom || !squareMeters) {
      toast.error('Veuillez sélectionner une pièce et entrer une surface');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/rooms/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: selectedRoom,
          squareMeters: parseFloat(squareMeters),
        }),
      });

      if (response.ok) {
        toast.success('Surface mise à jour avec succès');
        fetchRooms();
        setSquareMeters('');
        setSelectedRoom(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error updating square meters:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AdminNav />
      <div className="p-5 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Gérer les pièces</h1>
        <Toaster position="top-right" />
        
        <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-md">
          <div className="grid gap-4 mb-6">
            <select
              value={selectedRoom || ''}
              onChange={(e) => setSelectedRoom(Number(e.target.value))}
              className="w-full p-2 rounded border bg-[var(--input-background)] text-[var(--input-text)]"
              disabled={isLoading}
            >
              <option value="">Sélectionner une pièce</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} {room.squareMeters ? `(${room.squareMeters}m²)` : ''}
                </option>
              ))}
            </select>
            
            <div className="flex gap-4">
              <input
                type="number"
                value={squareMeters}
                onChange={(e) => setSquareMeters(e.target.value)}
                placeholder="Surface en m²"
                className="flex-1 p-2 rounded border bg-[var(--input-background)] text-[var(--input-text)]"
                disabled={isLoading}
              />
              <button
                onClick={handleUpdateSquareMeters}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Mettre à jour'}
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Liste des pièces</h2>
            <div className="grid gap-4">
              {rooms.map((room) => (
                <div key={room.id} className="flex justify-between items-center p-4 bg-[var(--background)] rounded border border-[var(--card-border)]">
                  <div>
                    <span className="text-[var(--foreground)]">{room.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({room._count?.products || 0} articles)
                    </span>
                  </div>
                  <span className="text-[var(--foreground)]">
                    {room.squareMeters ? `${room.squareMeters}m²` : 'Non défini'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 