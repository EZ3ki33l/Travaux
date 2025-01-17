"use client";

import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import AdminNav from "./components/AdminNav";

interface Product {
  id: number;
  name: string;
  price: number;
  room: {
    name: string;
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/get-products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors de la récupération des produits");
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/products/${deleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Produit supprimé avec succès");
        fetchProducts();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erreur lors de la suppression");
    }
    setDeleteId(null);
  };

  return (
    <>
      <AdminNav />
      <div className="max-w-7xl mx-auto px-10 py-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">
          Liste des articles
        </h1>
        <Toaster position="top-right" />

        <div className="grid gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-[var(--card-background)] p-4 rounded-lg shadow-md flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">
                  {product.name}
                </h2>
                <p className="text-sm text-[var(--foreground)]">
                  {product.price}€ - {product.room.name}
                </p>
              </div>
              <button
                onClick={() => handleDelete(product.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>

        {/* Modal de confirmation */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-[var(--card-background)] p-6 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
                Confirmer la suppression
              </h2>
              <p className="mb-6 text-[var(--foreground)]">
                Êtes-vous sûr de vouloir supprimer cet article ?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
