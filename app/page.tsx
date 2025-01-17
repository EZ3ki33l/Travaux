"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Room {
  id: number;
  name: string;
  squareMeters?: number;
}

interface Product {
  id: number;
  name: string;
  url: string;
  images: string[];
  price: number;
  description: string;
  priceType: string;
  room: {
    name: string;
  };
}

function Modal({ image, onClose }: { image: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
      onClick={onClose}
    >
      <img
        src={image}
        alt="Full size"
        className="max-w-[90%] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function ImageCarousel({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const validImages = images.filter(
    (img) => img.startsWith("http") || img.startsWith("data:image")
  );

  if (validImages.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <img
        src={validImages[currentIndex]}
        alt={`Image ${currentIndex + 1}`}
        className="w-full h-48 object-cover rounded cursor-pointer"
        onClick={() => setShowModal(true)}
      />
      {showModal && (
        <Modal
          image={validImages[currentIndex]}
          onClose={() => setShowModal(false)}
        />
      )}
      {validImages.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) =>
                prev === 0 ? validImages.length - 1 : prev - 1
              );
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 hover:bg-black/70 transition-colors"
          >
            ←
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) =>
                prev === validImages.length - 1 ? 0 : prev + 1
              );
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 hover:bg-black/70 transition-colors"
          >
            →
          </button>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const [isClient, setIsClient] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
    fetchProducts();
    fetchRooms();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedRoom, searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/get-products");
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedRoom) {
      filtered = filtered.filter(
        (product) => product.room.name === selectedRoom
      );
    }

    if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Mettre à jour les suggestions
      const newSuggestions = products
        .filter((product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((product) => product.name)
        .slice(0, 5);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }

    setFilteredProducts(filtered);
  };

  if (!isClient) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-10 py-6">
      {/* Bouton Admin */}
      <div className="flex justify-end mb-8">
        <Link
          href="/admin"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Administration
        </Link>
      </div>

      {/* Liste des pièces */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
          Pièces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-[var(--card-background)] p-4 rounded-lg shadow-md"
            >
              <h3 className="font-semibold text-[var(--foreground)]">
                {room.name}
              </h3>
              <p className="text-[var(--foreground)]">
                {room.squareMeters
                  ? `${room.squareMeters}m²`
                  : "Surface non définie"}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-[var(--card-background)] p-4 rounded-lg shadow-md">
          <h3 className="font-semibold text-[var(--foreground)] mb-2">
            Surface totale habitable
          </h3>
          <p className="text-[var(--foreground)]">
            {rooms
              .filter(
                (room) =>
                  !["garage", "jardin"].includes(room.name.toLowerCase())
              )
              .reduce((total, room) => total + (room.squareMeters || 0), 0)}
            m²
          </p>
          <p className="text-sm text-gray-500 mt-1">(Hors garage et jardin)</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
        Articles
      </h2>
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full p-2 rounded-lg bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--input-border)]"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-[var(--card-background)] rounded-lg shadow-lg border border-[var(--card-border)]">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSearchTerm(suggestion);
                    setSuggestions([]);
                  }}
                  className="p-2 hover:bg-gray-600 hover:text-white cursor-pointer text-[var(--foreground)]"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          className="p-2 rounded-lg bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--input-border)]"
        >
          <option value="">Toutes les pièces</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.name}>
              {room.name}
            </option>
          ))}
        </select>
      </div>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="border border-[var(--card-border)] rounded-lg p-4 bg-[var(--card-background)] shadow-md"
          >
            <div className="group relative">
              <h2 className="text-lg font-bold mb-2 truncate text-[var(--foreground)]">
                {product.name}
              </h2>
              <div className="absolute hidden group-hover:block left-0 top-full w-full bg-[var(--card-background)] p-2 rounded-md shadow-lg z-10 text-[var(--foreground)]">
                {product.name}
              </div>
            </div>
            <ImageCarousel images={product.images} />
            <h3 className="mt-3 mb-2 text-[var(--foreground)]">
              Pièce: {product.room?.name}
            </h3>
            <p className="mb-2 text-[var(--foreground)]">
              Prix: {product.price} €{" "}
              {product.priceType === "per m2" ? "/m²" : "/pièce"}
            </p>
            {product.description && (
              <p className="text-[var(--foreground)] line-clamp-3">
                Description: {product.description}
              </p>
            )}
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Voir sur le site
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
