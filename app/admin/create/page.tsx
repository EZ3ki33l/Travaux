"use client";

import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import AdminNav from "../components/AdminNav";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [url, setUrl] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priceType, setPriceType] = useState<string>("per piece");
  const [room, setRoom] = useState<string>("salon");
  const [images, setImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [renderKey, setRenderKey] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [manualImageUrl, setManualImageUrl] = useState<string>("");
  const router = useRouter();

  const handleFetchData = async () => {
    if (!url) {
      toast.error("Veuillez entrer une URL");
      return;
    }

    // Réinitialiser les états
    setImages([]);
    setSelectedImages([]);
    setPrice("");
    setDescription("");
    setRenderKey(prev => prev + 1);
    
    // Si c'est Leroy Merlin, traiter différemment
    if (url.includes('leroymerlin')) {
      toast.error('Le site Leroy Merlin ne permet pas la récupération automatique. Veuillez saisir les informations manuellement.');
      // Extraire et nettoyer le nom du produit de l'URL
      const urlParts = url.split('/');
      const rawName = urlParts[urlParts.length - 1]
        .split('#')[0] // Enlever tout ce qui suit le #
        .replace(/-/g, ' ')
        .replace(/\d+\.html$/, '') // Enlever le numéro et .html à la fin
        .replace(/\d+$/, '') // Enlever tout numéro à la fin
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliser chaque mot
        .join(' ');
      setName(rawName);
      return;
    }

    // Pour les autres sites
    setIsLoading(true);
    try {
      const response = await fetch(`/api/fetch-product?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (response.ok) {
        const filteredImages = (data.images || []).filter(
          (img: string) => img && (img.startsWith("http") || img.startsWith("data:image"))
        );
        setImages(filteredImages);
        setPrice(data.price || "");
        setDescription(data.description || "");
        setName(data.name || "");
        toast.success("Données récupérées avec succès");
      } else {
        console.error("Erreur:", data.error);
        toast.error(data.error || "Erreur lors de la récupération des données");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      toast.error("Erreur lors de la récupération des données");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleImageSelection = (image: string) => {
    setSelectedImages((prevSelected) =>
      prevSelected.includes(image)
        ? prevSelected.filter((img) => img !== image)
        : [...prevSelected, image]
    );
  };

  const handleSaveProduct = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/save-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          price,
          priceType,
          room,
          images: selectedImages,
          url,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      // Revalidate pages
      await Promise.all([
        fetch('/api/revalidate?path=/'),
        fetch('/api/revalidate?path=/admin'),
      ]);

      setIsLoading(false);
      router.push('/admin');
    } catch (error) {
      console.error('Error saving product:', error);
      setIsLoading(false);
    }
  };

  const handleAddManualImage = () => {
    if (!manualImageUrl) return;
    
    if (!manualImageUrl.startsWith('http')) {
      toast.error('Veuillez entrer une URL valide');
      return;
    }

    setImages(prev => [...prev, manualImageUrl]);
    setManualImageUrl('');
  };

  return (
    <>
      <AdminNav />
      <div className="p-5 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">
          Créer un article
        </h1>
        <Toaster position="top-right" />
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="URL du produit"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "var(--input-background)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
              borderRadius: "4px",
            }}
          />
          <button
            onClick={handleFetchData}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: isLoading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            {isLoading && (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid #ffffff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            {isLoading ? "Chargement..." : "Récupérer les données"}
          </button>
          <input
            type="text"
            placeholder="Nom du produit"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "var(--input-background)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
              borderRadius: "4px",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <input
              type="text"
              placeholder="Prix"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value.replace(/[^0-9.,]/g, ""))
              }
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: "var(--input-background)",
                color: "var(--input-text)",
                border: "1px solid var(--input-border)",
                borderRadius: "4px",
              }}
            />
            <span style={{ marginLeft: "5px", color: "var(--foreground)" }}>
              €
            </span>
          </div>
          <select
            value={priceType}
            onChange={(e) => setPriceType(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "var(--input-background)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
              borderRadius: "4px",
            }}
          >
            <option value="per piece">Par pièce</option>
            <option value="per m2">Par m²</option>
          </select>
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "var(--input-background)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
              borderRadius: "4px",
            }}
          >
            <option value="salon">Salon</option>
            <option value="cuisine">Cuisine</option>
            <option value="chambre 1">Chambre 1</option>
            <option value="chambre 2">Chambre 2</option>
            <option value="salle de bain">Salle de bain</option>
            <option value="toilettes">Toilettes</option>
            <option value="garage">Garage</option>
            <option value="jardin">Jardin</option>
          </select>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "var(--input-background)",
              color: "var(--input-text)",
              border: "1px solid var(--input-border)",
              borderRadius: "4px",
              minHeight: "100px",
            }}
          />
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="URL de l'image à ajouter"
              value={manualImageUrl}
              onChange={(e) => setManualImageUrl(e.target.value)}
              className="flex-1 p-2 rounded-lg bg-[var(--input-background)] text-[var(--input-text)] border border-[var(--input-border)]"
            />
            <button
              onClick={handleAddManualImage}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ajouter l'image
            </button>
          </div>
          <div
            key={renderKey}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            {images.map((img, index) => (
              <div
                key={`${renderKey}-${index}`}
                className="relative text-center"
              >
                <img
                  src={img}
                  alt={`Product image ${index}`}
                  className="w-full h-auto rounded-lg"
                />
                <div className="flex justify-between items-center mt-1">
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(img)}
                    onChange={() => toggleImageSelection(img)}
                  />
                  <button
                    onClick={() => setImages(prev => prev.filter(i => i !== img))}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveProduct}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: isLoading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            {isLoading && (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid #ffffff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            {isLoading ? "Enregistrement..." : "Enregistrer le produit"}
          </button>
        </div>
      </div>
    </>
  );
}
