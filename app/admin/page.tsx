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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/get-products");
      const data = await response.json();
      
      console.log("API Response:", data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!Array.isArray(data)) {
        console.error("Invalid data format:", data);
        throw new Error("Les données reçues ne sont pas au bon format");
      }

      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la récupération des produits");
      setProducts([]); // Réinitialiser à un tableau vide en cas d'erreur
    }
  };

  const handleDelete = async (id: number) => {
    console.log("Deleting product:", id);
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsLoading(true);

    try {
      console.log("Sending delete request for product:", deleteId);
      const response = await fetch(`/api/delete-product?id=${deleteId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      console.log("Delete response:", data);

      if (response.ok) {
        toast.success("Produit supprimé avec succès");
        await fetchProducts();
      } else {
        console.error("Delete failed:", data);
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsLoading(false);
      setDeleteId(null);
    }
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
                  {product.price}€ - {product.room?.name || "N/A"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(product.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "..." : "Supprimer"}
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
                  disabled={isLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
