import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product } from '../types';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS, ALLERGENS, ALLERGEN_MAP, normalizeCategory } from '../constants';
import { PlusIcon, PencilIcon, TrashIcon, UploadIcon, DownloadIcon, CheckIcon, XIcon } from './icons';
import { downloadPdfWithTables, exportToExcel } from './printUtils';


// Simple UUID generator
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

const EMPTY_PRODUCT: Omit<Product, 'id'> = {
    name: '',
    category: PRODUCT_CATEGORIES[0],
    price: 0,
    unit: PRODUCT_UNITS[0],
    allergens: [],
};

const CatalogoProductosView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>(() => {
        try {
            const saved = localStorage.getItem('cocina-catalogo-productos');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse products from localStorage", e);
            return [];
        }
    });

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Omit<Product, 'id'>>(EMPTY_PRODUCT);
    const [searchTerm, setSearchTerm] = useState('');
    const [stagedForImport, setStagedForImport] = useState<{ fileName: string; products: Product[] } | null>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        localStorage.setItem('cocina-catalogo-productos', JSON.stringify(products));
    }, [products]);

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name,
                category: editingProduct.category,
                price: editingProduct.price,
                unit: editingProduct.unit,
                allergens: editingProduct.allergens,
            });
        } else {
            setFormData(EMPTY_PRODUCT);
        }
    }, [editingProduct]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) : value }));
    };

    const handleAllergenChange = (allergen: string) => {
        setFormData(prev => {
            const newAllergens = prev.allergens.includes(allergen)
                ? prev.allergens.filter(a => a !== allergen)
                : [...prev.allergens, allergen];
            return { ...prev, allergens: newAllergens };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || formData.price < 0) {
            alert('Por favor, complete el nombre y un precio válido.');
            return;
        }

        if (editingProduct) {
            // Edit existing product
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...formData, id: p.id } : p));
        } else {
            // Add new product
            if (products.some(p => p.name.toLowerCase() === formData.name.trim().toLowerCase())) {
                alert('Ya existe un producto con este nombre.');
                return;
            }
            const newProduct: Product = { ...formData, id: uuidv4(), name: formData.name.trim() };
            setProducts(prev => [newProduct, ...prev]);
        }
        setEditingProduct(null);
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
    };

    const handleDeleteProduct = (productId: string) => {
        const productToDelete = products.find(p => p.id === productId);
        if (productToDelete && window.confirm(`¿Seguro que quieres eliminar "${productToDelete.name}"?`)) {
            setProducts(prev => prev.filter(p => p.id !== productId));
        }
    };
    
    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                if (!Array.isArray(imported)) throw new Error("JSON must be an array.");

                const newProducts: Product[] = [];
                const existingNames = new Set(products.map(p => p.name.toLowerCase()));

                for (const item of imported) {
                    if (item.name && item.category && item.unit && Array.isArray(item.allergens)) {
                         if (!existingNames.has(item.name.toLowerCase())) {
                            const mappedProduct: Product = {
                                id: uuidv4(),
                                name: item.name.trim(),
                                category: normalizeCategory(item.category),
                                price: item.price || 0, // Default price to 0 if not present
                                unit: item.unit,
                                allergens: item.allergens
                                    .map((code: string) => ALLERGEN_MAP[code])
                                    .filter((allergenName: string | undefined): allergenName is string => 
                                        !!allergenName && ALLERGENS.includes(allergenName)
                                    )
                            };
                            newProducts.push(mappedProduct);
                            existingNames.add(item.name.toLowerCase());
                         }
                    }
                }
                
                if(newProducts.length > 0) {
                    setStagedForImport({ fileName: file.name, products: newProducts });
                } else {
                    alert("No se encontraron nuevos productos válidos para importar en el archivo seleccionado. (Puede que ya existan)");
                }

            } catch (err) {
                 alert(`Error al procesar el archivo JSON: ${(err as Error).message}`);
            } finally {
                // Reset file input
                if(fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };
    
    const handleConfirmImport = () => {
        if (stagedForImport) {
            setProducts(prev => [...prev, ...stagedForImport.products]);
            alert(`${stagedForImport.products.length} productos importados y guardados con éxito.`);
            setStagedForImport(null);
        }
    };

    const handleCancelImport = () => {
        setStagedForImport(null);
    };

    const handleExportJson = () => {
        const dataStr = JSON.stringify(products, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'catalogo_productos.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        setIsExportMenuOpen(false);
    };

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.category.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchTerm]);
    
    const handleDownloadPdfCatalog = () => {
        const head = [['Producto', 'Categoría', 'Precio', 'Unidad', 'Alérgenos']];
        const body = filteredProducts.map(p => [
            p.name,
            p.category,
            `${p.price.toFixed(2)} €`,
            p.unit,
            p.allergens.join(', ')
        ]);
        
        const columnStyles = {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 35 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 'auto' }
        };

        downloadPdfWithTables('Catálogo de Productos', 'catalogo_productos', [{ head, body, columnStyles }]);
        setIsExportMenuOpen(false);
    };

    const handleExportExcel = () => {
        const dataToExport = filteredProducts.map(p => ({
            'Producto': p.name,
            'Categoría': p.category,
            'Precio': p.price,
            'Unidad': p.unit,
            'Alérgenos': p.allergens.join(', '),
        }));
        exportToExcel(dataToExport, 'catalogo_productos', 'Productos');
        setIsExportMenuOpen(false);
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column: Form */}
            <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md h-fit">
                <h3 className="text-xl font-bold text-gray-800 mb-6">{editingProduct ? `Editar Producto: ${editingProduct.name}` : 'Añadir Nuevo Producto'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required maxLength={100} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
                        <select name="category" id="category" value={formData.category} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm">
                            {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Precio</label>
                            <input type="number" name="price" id="price" value={formData.price} onChange={handleInputChange} required min="0" step="0.01" className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                         <div>
                            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                            <select name="unit" id="unit" value={formData.unit} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                {PRODUCT_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Alérgenos</label>
                        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {ALLERGENS.map(allergen => (
                                <label key={allergen} className="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={formData.allergens.includes(allergen)}
                                        onChange={() => handleAllergenChange(allergen)}
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="ml-2 text-gray-700">{allergen}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-4 pt-4">
                        {editingProduct && (
                            <button type="button" onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                                Cancelar
                            </button>
                        )}
                        <button type="submit" className="px-6 py-2 bg-teal-500 text-white font-bold rounded-md hover:bg-teal-600 flex items-center gap-2">
                            {editingProduct ? <CheckIcon className="h-5 w-5"/> : <PlusIcon className="h-5 w-5"/>}
                            {editingProduct ? 'Guardar Cambios' : 'Añadir Producto'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Right Column: List and Actions */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold text-gray-700 mb-2">Acciones</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold text-sm">
                            <UploadIcon className="h-5 w-5"/> Importar
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" className="hidden"/>

                        <div className="relative flex-1">
                            <button onClick={() => setIsExportMenuOpen(prev => !prev)} className="w-full flex items-center justify-center gap-2 p-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-semibold text-sm">
                                <DownloadIcon className="h-5 w-5"/> Exportar
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-full bg-white rounded-md shadow-lg z-10 border">
                                    <button onClick={handleDownloadPdfCatalog} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Descargar PDF</button>
                                    <button onClick={handleExportExcel} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Exportar a Excel</button>
                                    <button onClick={handleExportJson} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Exportar a JSON</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {stagedForImport && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-md">
                        <h4 className="font-bold text-yellow-800">Confirmar Importación</h4>
                        <p className="text-sm text-yellow-700 mt-1">Se encontraron <strong>{stagedForImport.products.length}</strong> nuevos productos en <em>{stagedForImport.fileName}</em>. ¿Deseas añadirlos al catálogo?</p>
                        <div className="flex justify-end gap-2 mt-3">
                            <button onClick={handleCancelImport} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-xs font-semibold">Cancelar</button>
                            <button onClick={handleConfirmImport} className="px-3 py-1 bg-yellow-500 text-white rounded-md text-xs font-semibold">Confirmar</button>
                        </div>
                    </div>
                )}

                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Catálogo de Productos ({products.length})</h2>
                    <input
                        type="text"
                        placeholder="Buscar producto o categoría..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                    />
                    <div className="overflow-y-auto max-h-[55vh] pr-2">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-2 px-3 text-left font-medium text-gray-600">Producto</th>
                                    <th className="py-2 px-3 text-left font-medium text-gray-600">Categoría</th>
                                    <th className="py-2 px-3 text-left font-medium text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className="border-t hover:bg-gray-50">
                                        <td className="py-2 px-3 font-medium text-gray-800">{product.name}</td>
                                        <td className="py-2 px-3 text-gray-600">{product.category}</td>
                                        <td className="py-2 px-3 text-right">
                                            <button onClick={() => setEditingProduct(product)} className="text-blue-600 hover:text-blue-800 p-1"><PencilIcon className="h-4 w-4"/></button>
                                            <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="h-4 w-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <p className="text-center text-gray-500 py-8">No se encontraron productos.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CatalogoProductosView;