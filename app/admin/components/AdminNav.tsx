'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-[var(--card-background)] shadow-md">
      <div className="max-w-7xl mx-auto px-10 py-4">
        <div className="flex justify-between items-center">
          <Link 
            href="/"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Retour au site</span>
          </Link>
          
          <div className="flex space-x-8">
            <Link
              href="/admin/create"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/create')
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--foreground)] hover:bg-gray-600 hover:text-white'
              }`}
            >
              Créer un article
            </Link>
            <Link
              href="/admin"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin')
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--foreground)] hover:bg-gray-600 hover:text-white'
              }`}
            >
              Liste des articles
            </Link>
            <Link
              href="/admin/rooms"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/rooms')
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--foreground)] hover:bg-gray-600 hover:text-white'
              }`}
            >
              Gérer les pièces
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 