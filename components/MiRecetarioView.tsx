import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Recipe, Product, RecipeIngredient, RecipeStep, Elaboration } from '../types';
import { ALLERGENS, PRODUCT_UNITS, PRODUCT_CATEGORIES, RECIPE_CATEGORIES } from '../constants';
import { PencilIcon, PlusIcon, TrashIcon, BackIcon, UploadIcon, EyeIcon, DownloadIcon, XIcon, CheckIcon, ClipboardIcon, CodeBracketIcon, SearchIcon, LinkIcon } from './icons';
import { downloadPdfWithTables } from './printUtils';

// --- HELPER FUNCTIONS ---
const uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

const EMPTY_ELABORATION: Elaboration = { id: uuidv4(), name: 'Elaboración Principal', ingredients: [], steps: [{ id: uuidv4(), description: '' }] };
const EMPTY_RECIPE: Omit<Recipe, 'id' | 'authorId' | 'createdAt' | 'updatedAt'> = {
    name: '',
    category: RECIPE_CATEGORIES[0],
    servings: 1,
    description: '',
    serviceNotes: '',
    imageUrl: undefined,
    elaborations: [JSON.parse(JSON.stringify(EMPTY_ELABORATION))],
    visibility: 'private',
};

const KitchenIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m-3-1l-3-1m3 1v5.25c0 .621-.504 1.125-1.125-1.125h-2.25c-.621 0-1.125-.504-1.125-1.125V10.5m0 0L12 9M12 9l-3 1m0 0l-4.5 1.636M12 9V3.545" /></svg>
);


// --- SUB-COMPONENTS ---

const AddProductModal: React.FC<{
    initialName: string;
    onSave: (newProduct: Product) => void;
    onCancel: () => void;
}> = ({ initialName, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Omit<Product, 'id'>>({
        name: initialName,
        category: PRODUCT_CATEGORIES[0],
        price: 0,
        unit: 'kg',
        allergens: []
    });

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
        if (!formData.name.trim()) {
            alert('El nombre del producto no puede estar vacío.');
            return;
        }
        const newProduct: Product = { ...formData, id: uuidv4(), name: formData.name.trim() };
        onSave(newProduct);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-bold text-gray-800">Crear Nuevo Producto</h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                <select name="category" value={formData.category} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white">
                                    {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Unidad</label>
                                <select name="unit" value={formData.unit} onChange={handleInputChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white">
                                    {PRODUCT_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Coste (Precio)</label>
                            <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min="0" step="0.01" className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Alérgenos</label>
                            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {ALLERGENS.map(allergen => (
                                    <label key={allergen} className="flex items-center text-sm">
                                        <input type="checkbox" checked={formData.allergens.includes(allergen)} onChange={() => handleAllergenChange(allergen)} className="h-4 w-4 rounded border-gray-300 text-teal-600"/>
                                        <span className="ml-2 text-gray-700">{allergen}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 flex justify-end gap-4">
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-teal-500 text-white font-bold rounded-md hover:bg-teal-600">Crear y Añadir</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RecipeFormView: React.FC<{
    initialRecipe: Recipe | null;
    products: Product[];
    recipeCategories: string[];
    onSave: (recipe: Recipe) => void;
    onCancel: () => void;
    onAddNewProduct: (newProduct: Product) => void;
}> = ({ initialRecipe, products, recipeCategories, onSave, onCancel, onAddNewProduct }) => {
    const [formData, setFormData] = useState<Omit<Recipe, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>>(() => 
        initialRecipe 
            ? JSON.parse(JSON.stringify({ ...initialRecipe }))
            : JSON.parse(JSON.stringify(EMPTY_RECIPE))
    );

    const [allRecipeCategories, setAllRecipeCategories] = useState<string[]>(recipeCategories);
    const [newCategory, setNewCategory] = useState('');
    const [ingredientSearch, setIngredientSearch] = useState<{ elabId: string; term: string }>({ elabId: '', term: '' });
    const [isAddingProduct, setIsAddingProduct] = useState<string | null>(null);
    const imageUploadRef = useRef<HTMLInputElement>(null);

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === "category" && value === "add_new") {
            const enteredCategory = prompt("Introduce el nombre de la nueva categoría:");
            if (enteredCategory && !allRecipeCategories.includes(enteredCategory)) {
                const updatedCategories = [...allRecipeCategories, enteredCategory];
                setAllRecipeCategories(updatedCategories);
                setFormData(prev => ({ ...prev, category: enteredCategory }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: name === 'servings' ? Math.max(1, parseInt(value, 10)) : value }));
        }
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleElaborationChange = <K extends keyof Elaboration>(elabId: string, field: K, value: Elaboration[K]) => {
        setFormData(prev => ({
            ...prev,
            elaborations: prev.elaborations.map(e => e.id === elabId ? { ...e, [field]: value } : e)
        }));
    };

    const addElaboration = () => {
        const newElaboration: Elaboration = { id: uuidv4(), name: `Elaboración ${formData.elaborations.length + 1}`, ingredients: [], steps: [{ id: uuidv4(), description: '' }] };
        setFormData(prev => ({ ...prev, elaborations: [...prev.elaborations, newElaboration] }));
    };

    const removeElaboration = (elabId: string) => {
        if (formData.elaborations.length > 1) {
            setFormData(prev => ({ ...prev, elaborations: prev.elaborations.filter(e => e.id !== elabId) }));
        } else {
            alert("Debe haber al menos una elaboración.");
        }
    };

    const handleIngredientChange = (elabId: string, productId: string, field: keyof RecipeIngredient, value: any) => {
        setFormData(prev => ({
            ...prev,
            elaborations: prev.elaborations.map(e => e.id === elabId ? { ...e, ingredients: e.ingredients.map(i => i.productId === productId ? { ...i, [field]: value } : i) } : e)
        }));
    };
    
    const addIngredient = (elabId: string, product: Product) => {
        const newIngredient: RecipeIngredient = { productId: product.id, quantity: 1, unit: product.unit };
        setFormData(prev => ({
            ...prev,
            elaborations: prev.elaborations.map(e => {
                if (e.id === elabId) {
                    if (e.ingredients.some(ing => ing.productId === product.id)) return e;
                    return { ...e, ingredients: [...e.ingredients, newIngredient] };
                }
                return e;
            })
        }));
        setIngredientSearch({ elabId: '', term: '' });
    };

    const removeIngredient = (elabId: string, productId: string) => {
        setFormData(prev => ({
            ...prev,
            elaborations: prev.elaborations.map(e => e.id === elabId ? { ...e, ingredients: e.ingredients.filter(i => i.productId !== productId) } : e)
        }));
    };

    const handleStepChange = (elabId: string, stepId: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            elaborations: prev.elaborations.map(e => e.id === elabId ? { ...e, steps: e.steps.map(s => s.id === stepId ? { ...s, description: value } : s) } : e)
        }));
    };

    const addStep = (elabId: string) => {
        setFormData(prev => ({
            ...prev,
            elaborations: prev.elaborations.map(e => e.id === elabId ? { ...e, steps: [...e.steps, { id: uuidv4(), description: '' }] } : e)
        }));
    };

    const removeStep = (elabId: string, stepId: string) => {
        setFormData(prev => ({
            ...prev,
            elaborations: prev.elaborations.map(e => e.id === elabId ? { ...e, steps: e.steps.filter(s => s.id !== stepId) } : e)
        }));
    };

    const handleNewProductSaved = (newProduct: Product) => {
        onAddNewProduct(newProduct);
        if(isAddingProduct) {
           addIngredient(isAddingProduct, newProduct);
        }
        setIsAddingProduct(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalRecipe: Recipe = {
            ...formData,
            id: initialRecipe?.id || uuidv4(),
            authorId: initialRecipe?.authorId || 'currentUser',
            createdAt: initialRecipe?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        onSave(finalRecipe);
    };

    const searchedProducts = useMemo(() => {
        const searchTerm = ingredientSearch.term.trim().toLowerCase();
        if (!searchTerm) {
            return [];
        }

        const searchTokens = searchTerm.split(/\s+/).filter(Boolean);
        if (searchTokens.length === 0) {
            return [];
        }
        
        const filteredProducts = products.filter(product => {
            const productNameLower = product.name.toLowerCase();
            return searchTokens.every(token => productNameLower.includes(token));
        });

        const scoredProducts = filteredProducts.map(product => {
            const productNameLower = product.name.toLowerCase();
            let score = 0;

            // Base score for being in the filtered list
            score += 1;
            
            // Higher score if the product name starts with the full search term
            if (productNameLower.startsWith(searchTerm)) {
                score += 10;
            }

            // Bonus for each token being the start of a word
            const productWords = productNameLower.split(/\s+/);
            searchTokens.forEach(token => {
                if (productWords.some(word => word.startsWith(token))) {
                    score += 2;
                }
            });

            // Highest score for exact match
            if (productNameLower === searchTerm) {
                score += 100;
            }
            
            return { product, score };
        });

        // Sort by score descending, then alphabetically
        return scoredProducts
            .sort((a, b) => {
                if (a.score !== b.score) {
                    return b.score - a.score;
                }
                return a.product.name.localeCompare(b.product.name);
            })
            .map(item => item.product)
            .slice(0, 5); // Limit results for performance and UI
    }, [ingredientSearch.term, products]);

    const { totalCost, totalAllergens } = useMemo(() => {
        let cost = 0;
        const allergens = new Set<string>();
        formData.elaborations.forEach(elab => {
            elab.ingredients.forEach(ing => {
                const product = products.find(p => p.id === ing.productId);
                if (product) {
                    cost += (product.price || 0) * ing.quantity;
                    product.allergens.forEach(a => allergens.add(a));
                }
            });
        });
        return { totalCost: cost, totalAllergens: Array.from(allergens) };
    }, [formData.elaborations, products]);
    
    const handleDownloadRecipe = () => {
        const tables: any[] = [];
    
        if (formData.imageUrl) {
            // This is a simplified way to add an image. jspdf-autotable has limited, direct image support.
            // We create a single-cell table for it.
            tables.push({
                body: [[{ image: formData.imageUrl, styles: { halign: 'center', minCellHeight: 50 } }]],
                options: { theme: 'plain' }
            });
        }
    
        if (formData.description) {
            tables.push({
                head: [['Descripción']],
                body: [[formData.description]],
                options: { headStyles: { fontStyle: 'bold', fillColor: '#f3f4f6', textColor: '#1f2937' } }
            });
        }
    
        formData.elaborations.forEach(elab => {
            tables.push({
                head: [[{ content: elab.name, styles: { fontStyle: 'bold', fontSize: 14, fillColor: '#f0fdf4', textColor: '#15803d' } }]],
            });
    
            const ingredientsBody = elab.ingredients.map(ing => {
                const p = products.find(prod => prod.id === ing.productId);
                return [p?.name || 'N/A', `${ing.quantity.toFixed(2)}`, ing.unit];
            });
    
            if (ingredientsBody.length > 0) {
                tables.push({
                    head: [['Ingredientes', 'Cantidad', 'Unidad']],
                    body: ingredientsBody,
                    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25 }, 2: { cellWidth: 20 } }
                });
            }
            
            const stepsBody = elab.steps.map((step, i) => [`${i + 1}. ${step.description}`]);
    
            if (stepsBody.length > 0 && stepsBody.some(row => row[0].trim().length > 2)) {
                tables.push({
                    head: [['Pasos']],
                    body: stepsBody,
                });
            }
        });
    
        if (formData.serviceNotes) {
            tables.push({
                head: [['Notas de Servicio / Emplatado']],
                body: [[formData.serviceNotes]],
                options: { headStyles: { fontStyle: 'bold', fillColor: '#f3f4f6', textColor: '#1f2937' } }
            });
        }
    
        const title = `Ficha Técnica: ${formData.name} (${formData.servings} pax)`;
        const fileName = `ficha_tecnica_${formData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        downloadPdfWithTables(title, fileName, tables);
    };

    return (
        <>
            {isAddingProduct && (
                <AddProductModal 
                    initialName={ingredientSearch.term}
                    onSave={handleNewProductSaved}
                    onCancel={() => setIsAddingProduct(null)}
                />
            )}
            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
                {/* Main Form Content */}
                <div className="flex-grow space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-start">
                             <h2 className="text-2xl font-bold text-gray-800 mb-4">{initialRecipe?.id ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica'}</h2>
                             <button type="button" onClick={onCancel} className="flex items-center text-sm text-gray-600 hover:text-black font-semibold">
                                <BackIcon className="h-4 w-4 mr-1" /> Volver
                            </button>
                        </div>
                       
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-gray-700">Foto de la Receta</label>
                                 <div onClick={() => imageUploadRef.current?.click()} className="mt-1 cursor-pointer w-full h-40 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gray-50 hover:bg-gray-100">
                                    {formData.imageUrl ? (
                                        <img src={formData.imageUrl} alt="Vista previa" className="max-h-full max-w-full object-contain"/>
                                    ) : <div className="text-center text-gray-400"><UploadIcon className="h-8 w-8 mx-auto"/><span className="text-xs">Subir imagen</span></div>}
                                 </div>
                                 <input type="file" ref={imageUploadRef} onChange={handleImageUpload} accept="image/*" className="hidden"/>
                            </div>
                            <div className="md:col-span-3 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre de la Receta</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleFieldChange} required className="mt-1 w-full p-2 border rounded-md"/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                        <select name="category" value={formData.category} onChange={handleFieldChange} className="mt-1 w-full p-2 border rounded-md bg-white">
                                            {allRecipeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            <option value="add_new" className="font-bold text-teal-600">+ Añadir nueva</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nº Raciones</label>
                                        <input type="number" name="servings" value={formData.servings} onChange={handleFieldChange} min="1" className="mt-1 w-full p-2 border rounded-md"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Elaborations */}
                    <div className="space-y-4">
                        {formData.elaborations.map((elab, elabIndex) => (
                           <details key={elab.id} open className="bg-white p-4 rounded-lg shadow-md border-l-4 border-teal-500">
                                <summary className="font-bold text-lg cursor-pointer flex justify-between items-center">
                                    <input type="text" value={elab.name} onChange={e => handleElaborationChange(elab.id, 'name', e.target.value)} className="font-bold text-lg p-1 -ml-1 flex-grow" />
                                    <button type="button" onClick={() => removeElaboration(elab.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="h-5 w-5"/></button>
                                </summary>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    {/* Ingredients */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-700">Ingredientes</h4>
                                        <div className="relative">
                                            <input type="text" placeholder="Buscar ingrediente..." value={ingredientSearch.elabId === elab.id ? ingredientSearch.term : ''} onChange={e => setIngredientSearch({ elabId: elab.id, term: e.target.value })} className="w-full p-2 border rounded-md"/>
                                            {ingredientSearch.elabId === elab.id && ingredientSearch.term && (
                                                <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">
                                                    {searchedProducts.map(p => (
                                                        <div key={p.id} onClick={() => addIngredient(elab.id, p)} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name}</div>
                                                    ))}
                                                    <div onClick={() => setIsAddingProduct(elab.id)} className="p-2 hover:bg-teal-50 cursor-pointer font-semibold text-teal-600">+ Crear y añadir "{ingredientSearch.term}"</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {elab.ingredients.map(ing => {
                                                const product = products.find(p => p.id === ing.productId);
                                                return (
                                                    <div key={ing.productId} className="flex items-center gap-2 text-sm bg-gray-50 p-1.5 rounded">
                                                        <span className="flex-grow font-medium">{product?.name || 'Producto no encontrado'}</span>
                                                        <input type="number" value={ing.quantity} onChange={e => handleIngredientChange(elab.id, ing.productId, 'quantity', parseFloat(e.target.value))} min="0" step="0.01" className="w-20 p-1 border rounded"/>
                                                        <select value={ing.unit} onChange={e => handleIngredientChange(elab.id, ing.productId, 'unit', e.target.value)} className="p-1 border rounded bg-white">
                                                            {PRODUCT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                        <button type="button" onClick={() => removeIngredient(elab.id, ing.productId)}><TrashIcon className="h-4 w-4 text-gray-500"/></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* Steps */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-700">Pasos de Preparación</h4>
                                        {elab.steps.map((step, stepIndex) => (
                                            <div key={step.id} className="flex items-start gap-2">
                                                <span className="font-bold text-teal-600 pt-2">{stepIndex + 1}.</span>
                                                <textarea value={step.description} onChange={e => handleStepChange(elab.id, step.id, e.target.value)} rows={2} className="flex-grow p-2 border rounded-md"></textarea>
                                                <button type="button" onClick={() => removeStep(elab.id, step.id)} className="pt-2"><TrashIcon className="h-5 w-5 text-gray-500"/></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => addStep(elab.id)} className="text-sm text-teal-600 font-semibold">+ Añadir paso</button>
                                    </div>
                                </div>
                            </details>
                        ))}
                        <button type="button" onClick={addElaboration} className="w-full text-center py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200">+ Añadir Elaboración</button>
                    </div>

                    {/* Final notes */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                         <h3 className="text-xl font-bold text-gray-800 mb-4">Notas Adicionales</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                               <label className="block text-sm font-medium text-gray-700">Descripción General</label>
                               <textarea name="description" value={formData.description} onChange={handleFieldChange} rows={4} className="mt-1 w-full p-2 border rounded-md"></textarea>
                            </div>
                             <div>
                               <label className="block text-sm font-medium text-gray-700">Notas de Servicio / Emplatado</label>
                               <textarea name="serviceNotes" value={formData.serviceNotes} onChange={handleFieldChange} rows={4} className="mt-1 w-full p-2 border rounded-md"></textarea>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Sticky Sidebar */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="sticky top-8 space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="font-bold text-lg text-gray-800 border-b pb-2 mb-3">Resumen de la Receta</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Coste Total Aprox:</span>
                                    <span className="font-semibold text-gray-900">{totalCost.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Coste por Ración:</span>
                                    <span className="font-semibold text-gray-900">{(totalCost / formData.servings).toFixed(2)} €</span>
                                </div>
                            </div>
                             <button type="button" onClick={handleDownloadRecipe} className="w-full mt-4 text-sm text-center py-2 bg-blue-100 text-blue-800 font-semibold rounded-md hover:bg-blue-200 flex items-center justify-center gap-2">
                                <DownloadIcon className="h-5 w-5"/>
                                Descargar Ficha (PDF)
                            </button>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="font-bold text-lg text-gray-800 border-b pb-2 mb-3">Alérgenos Presentes</h3>
                            {totalAllergens.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {totalAllergens.map(a => <span key={a} className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{a}</span>)}
                                </div>
                            ) : <p className="text-sm text-gray-500 italic">No se han detectado alérgenos.</p>}
                        </div>
                         <button type="submit" className="w-full px-6 py-3 bg-teal-500 text-white font-bold rounded-md hover:bg-teal-600 text-lg">
                            {initialRecipe?.id ? 'Actualizar Ficha Técnica' : 'Guardar Ficha Técnica'}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
};

const RecipeCard: React.FC<{ recipe: Recipe; onSelect: () => void; }> = ({ recipe, onSelect }) => (
    <div onClick={onSelect} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col overflow-hidden group">
        <div className="h-40 bg-gray-200 flex items-center justify-center overflow-hidden relative">
            {recipe.imageUrl ? (
                <img src={recipe.imageUrl} alt={recipe.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <KitchenIcon className="h-16 w-16 text-gray-400" />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                 <EyeIcon className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </div>
        <div className="p-4 flex-grow flex flex-col">
            <span className="text-xs font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full self-start">{recipe.category}</span>
            <h3 className="mt-2 font-bold text-gray-800 text-lg flex-grow">{recipe.name}</h3>
            <div className="mt-2 text-xs text-gray-500">
                Actualizado: {new Date(recipe.updatedAt || recipe.createdAt).toLocaleDateString()}
            </div>
        </div>
    </div>
);

const TemplatePromptModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [isCopied, setIsCopied] = useState(false);

    const PROMPT_TEXT = `Actúa como un asistente de cocina experto en digitalización de recetas. Tu tarea es convertir la siguiente receta de cocina, que te proporcionaré en texto plano, a un formato JSON específico. Es crucial que sigas la estructura y las reglas al pie de la letra, prestando especial atención a cómo se anidan los ingredientes.

Estructura JSON Requerida:
Debes generar un único objeto JSON con la siguiente estructura. Observa que la lista de ingredientes va DENTRO de cada elaboración.
\`\`\`json
{
  "name": "string",
  "category": "string",
  "servings": "number",
  "description": "string",
  "serviceNotes": "string",
  "elaborations": [
    {
      "name": "string",
      "ingredients": [
        {
          "name": "string",
          "quantity": "number",
          "unit": "string"
        }
      ],
      "steps": [
        "string"
      ]
    }
  ]
}
\`\`\`
Reglas y Guía de Campos:
- name: El nombre completo y descriptivo del plato.
- category: La categoría del plato. Usa una de las siguientes: Entrantes, Sopas y Cremas, Ensaladas, Arroces y Pastas, Carnes, Pescados, Guarniciones, Postres, Salsas, Bebidas.
- servings: El número total de raciones que produce la receta. Debe ser un número.
- description: Texto breve que describa el plato.
- serviceNotes: Anotaciones para el emplatado o servicio.
- elaborations: Un array de elaboraciones. Toda receta debe tener al menos una. Si la receta no está dividida en partes, crea una única elaboración llamada "Elaboración Principal".
- elaborations.name: Nombre de la parte de la receta (ej. "Masa de la tarta", "Relleno", "Salsa").
- elaborations.ingredients: (IMPORTANTE) Un array de objetos, uno por cada ingrediente utilizado únicamente en esta elaboración.
- ingredients.name: Nombre exacto del producto (ej. "Harina de trigo", "Huevo").
- ingredients.quantity: La cantidad. Debe ser un número, no texto (usa 0.5 en vez de "1/2").
- ingredients.unit: La unidad de medida estandarizada: kg, litro, unidad, gramo, mililitro, manojo.
- elaborations.steps: Un array de strings, donde cada string es un paso de la preparación de esta elaboración.

Instrucción Final Importante:
Tu respuesta debe ser únicamente el código JSON, sin explicaciones adicionales, comentarios, ni el formato de bloque de código \`\`\`json ... \`\`\`. Solo el JSON puro.`;

    const handleCopy = () => {
        navigator.clipboard.writeText(PROMPT_TEXT).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Error al copiar el texto al portapapeles.');
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Prompt para Generación de Ficha JSON</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <p className="mb-4 text-gray-700">Copia el siguiente texto, pégalo en tu IA generativa de preferencia (como Gemini) y a continuación, pega el texto de tu receta para que la convierta al formato JSON correcto.</p>
                    <div className="bg-gray-800 text-white p-4 rounded-md relative font-mono text-sm">
                        <pre className="whitespace-pre-wrap">{PROMPT_TEXT}</pre>
                        <button onClick={handleCopy} className="absolute top-3 right-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-1 px-3 rounded-md text-sm flex items-center gap-2 transition-colors">
                           {isCopied ? <CheckIcon className="h-5 w-5 text-green-400"/> : <ClipboardIcon className="h-5 w-5"/>}
                           {isCopied ? '¡Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>
                 <div className="bg-gray-50 p-4 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

// --- NEW RECONCILIATION MODAL ---
interface UnrecognizedIngredient {
  originalName: string;
  quantity: number;
  unit: string;
  elaborationId: string;
  elaborationName: string;
}
interface ReconciliationState {
  unrecognized: UnrecognizedIngredient[];
  partiallyMappedRecipe: Omit<Recipe, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>;
  resolutions: { [originalName: string]: string };
}
const IngredientReconciliationModal: React.FC<{
    state: ReconciliationState;
    setState: React.Dispatch<React.SetStateAction<ReconciliationState | null>>;
    products: Product[];
    onFinalize: (resolutions: { [originalName: string]: string }) => void;
    onCancel: () => void;
    onCreateNewProduct: (unrecognizedIngredient: UnrecognizedIngredient) => void;
}> = ({ state, setState, products, onFinalize, onCancel, onCreateNewProduct }) => {
    const [searches, setSearches] = useState<{ [key: string]: string }>({});

    const handleSearchChange = (originalName: string, term: string) => {
        setSearches(prev => ({ ...prev, [originalName]: term }));
    };

    const handleLinkProduct = (originalName: string, productId: string) => {
        setState(prev => prev ? {
            ...prev,
            resolutions: { ...prev.resolutions, [originalName]: productId }
        } : null);
    };
    
    const handleUnlinkProduct = (originalName: string) => {
         setState(prev => {
            if (!prev) return null;
            const newResolutions = { ...prev.resolutions };
            delete newResolutions[originalName];
            return { ...prev, resolutions: newResolutions };
        });
    };

    const getSearchResults = (term: string) => {
        if (!term) return [];
        return products.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
    };

    const resolvedCount = Object.keys(state.resolutions).length;
    const totalCount = state.unrecognized.length;
    const isFinalizable = resolvedCount === totalCount;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Conciliación de Ingredientes</h2>
                    <p className="text-sm text-gray-600 mt-1">Se han encontrado {totalCount} ingredientes no reconocidos. Por favor, vincúlalos a un producto existente o crea uno nuevo.</p>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                    {state.unrecognized.map(item => {
                        const resolvedProductId = state.resolutions[item.originalName];
                        if (resolvedProductId) {
                            const linkedProduct = products.find(p => p.id === resolvedProductId);
                            return (
                                <div key={item.originalName} className="bg-green-50 p-3 rounded-md border-l-4 border-green-500 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-700">{item.originalName}</p>
                                        <p className="text-sm text-green-700 font-semibold flex items-center gap-2">
                                            <LinkIcon className="h-4 w-4" />
                                            Vinculado a: "{linkedProduct?.name || '???'}"
                                        </p>
                                    </div>
                                    <button onClick={() => handleUnlinkProduct(item.originalName)} className="text-sm font-semibold text-gray-600 hover:text-red-600">Desvincular</button>
                                </div>
                            );
                        }

                        const searchTerm = searches[item.originalName] || '';
                        const searchResults = getSearchResults(searchTerm);

                        return (
                            <div key={item.originalName} className="bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400">
                                <p className="font-bold text-gray-700">{item.originalName}</p>
                                <p className="text-xs text-gray-500 mb-2">En elaboración: "{item.elaborationName}"</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div className="relative">
                                        <label className="text-sm font-medium text-gray-600">Buscar producto existente</label>
                                        <div className="relative">
                                            <SearchIcon className="h-5 w-5 absolute top-1/2 left-2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar en catálogo..."
                                                value={searchTerm}
                                                onChange={(e) => handleSearchChange(item.originalName, e.target.value)}
                                                className="w-full p-2 pl-8 border rounded-md"
                                            />
                                        </div>
                                        {searchTerm && (
                                            <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                                {searchResults.length > 0 ? searchResults.map(p => (
                                                    <div key={p.id} onClick={() => handleLinkProduct(item.originalName, p.id)} className="p-2 text-sm hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                                                        <span>{p.name}</span>
                                                        <button className="text-teal-600 hover:text-teal-800"><LinkIcon className="h-5 w-5"/></button>
                                                    </div>
                                                )) : <p className="p-2 text-sm text-gray-500 italic">No se encontraron productos.</p>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center md:text-left">
                                         <label className="text-sm font-medium text-gray-600">¿No lo encuentras?</label>
                                        <button onClick={() => onCreateNewProduct(item)} className="w-full mt-1 flex items-center justify-center gap-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold text-sm">
                                            <PlusIcon className="h-5 w-5"/> Crear Nuevo Producto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="bg-gray-50 p-4 flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-700">{resolvedCount} de {totalCount} ingredientes resueltos.</p>
                    <div className="flex gap-4">
                        <button onClick={onCancel} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancelar</button>
                        <button onClick={() => onFinalize(state.resolutions)} disabled={!isFinalizable} className="px-6 py-2 bg-teal-500 text-white font-bold rounded-md hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            Finalizar Importación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN VIEW COMPONENT ---
const MiRecetarioView: React.FC = () => {
    const [recipes, setRecipes] = useState<Recipe[]>(() => {
        try {
            const saved = localStorage.getItem('cocina-mi-recetario');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse recipes from localStorage", e);
            return [];
        }
    });

    const [products, setProducts] = useState<Product[]>(() => {
        try {
            const saved = localStorage.getItem('cocina-catalogo-productos');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse products from localStorage", e);
            return [];
        }
    });

    const [view, setView] = useState<'list' | 'form'>('list');
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);

    const [reconciliationState, setReconciliationState] = useState<ReconciliationState | null>(null);
    const [isAddingProductFromModal, setIsAddingProductFromModal] = useState<UnrecognizedIngredient | null>(null);


    const allRecipeCategories = useMemo(() => {
        const categories = new Set(RECIPE_CATEGORIES);
        recipes.forEach(r => categories.add(r.category));
        return Array.from(categories);
    }, [recipes]);

    useEffect(() => {
        localStorage.setItem('cocina-mi-recetario', JSON.stringify(recipes));
    }, [recipes]);
    
    useEffect(() => {
        const syncProducts = () => {
            try {
                const saved = localStorage.getItem('cocina-catalogo-productos');
                if(saved) setProducts(JSON.parse(saved));
            } catch(e) { console.error("Failed to sync products", e) }
        };
        syncProducts();
        window.addEventListener('storage', syncProducts);
        return () => window.removeEventListener('storage', syncProducts);
    }, []);

    const handleSaveRecipe = (recipe: Recipe) => {
        const exists = recipes.some(r => r.id === recipe.id);
        if (exists) {
            setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r));
        } else {
            setRecipes(prev => [recipe, ...prev]);
        }
        setView('list');
        setSelectedRecipe(null);
    };

    const handleEditRecipe = (recipe: Recipe) => {
        setSelectedRecipe(recipe);
        setView('form');
    };

    const handleAddNewRecipe = () => {
        setSelectedRecipe(null);
        setView('form');
    };
    
    const handleCancelForm = () => {
        setView('list');
        setSelectedRecipe(null);
    };
    
    const handleAddNewProduct = (newProduct: Product) => {
        const updatedProducts = [...products, newProduct];
        setProducts(updatedProducts);
        localStorage.setItem('cocina-catalogo-productos', JSON.stringify(updatedProducts));
    };

    const handleShowPrompt = () => {
        setIsPromptModalOpen(true);
    };

    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);

                const unrecognizedIngredients: UnrecognizedIngredient[] = [];
                const partiallyMappedElaborations: Elaboration[] = (imported.elaborations || []).map((elab: any) => {
                    const elabId = uuidv4();
                    const mappedIngredients: RecipeIngredient[] = [];

                    (elab.ingredients || []).forEach((ing: any) => {
                        const productName = ing.name?.trim().toLowerCase();
                        if (!productName) return;

                        const product = products.find(p => p.name.toLowerCase() === productName);
                        if (product) {
                            mappedIngredients.push({ productId: product.id, quantity: ing.quantity || 0, unit: ing.unit || product.unit });
                        } else {
                            unrecognizedIngredients.push({
                                originalName: ing.name.trim(),
                                quantity: ing.quantity || 0,
                                unit: ing.unit || 'unidad',
                                elaborationId: elabId,
                                elaborationName: elab.name || 'Elaboración sin nombre'
                            });
                        }
                    });

                    return {
                        id: elabId,
                        name: elab.name || 'Elaboración sin nombre',
                        ingredients: mappedIngredients,
                        steps: (elab.steps || []).map((step: string) => ({ id: uuidv4(), description: step }))
                    };
                });
                
                const partiallyMappedRecipe: Omit<Recipe, 'id' | 'authorId' | 'createdAt' | 'updatedAt'> = {
                    ...EMPTY_RECIPE,
                    name: imported.name || 'Receta Sin Nombre',
                    category: imported.category || RECIPE_CATEGORIES[0],
                    servings: imported.servings || 1,
                    description: imported.description || '',
                    serviceNotes: imported.serviceNotes || '',
                    elaborations: partiallyMappedElaborations.length > 0 ? partiallyMappedElaborations : [JSON.parse(JSON.stringify(EMPTY_ELABORATION))]
                };
                
                if (unrecognizedIngredients.length > 0) {
                     setReconciliationState({
                        unrecognized: unrecognizedIngredients,
                        partiallyMappedRecipe: partiallyMappedRecipe,
                        resolutions: {}
                    });
                } else {
                    setSelectedRecipe(partiallyMappedRecipe as Recipe);
                    setView('form');
                }

            } catch (err) {
                alert(`Error al procesar el archivo JSON: ${(err as Error).message}`);
            } finally {
                if (importInputRef.current) importInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };
    
    const handleFinalizeReconciliation = (finalResolutions: { [originalName: string]: string }) => {
        if (!reconciliationState) return;

        const { partiallyMappedRecipe, unrecognized } = reconciliationState;
        
        const newIngredientsByElab = new Map<string, RecipeIngredient[]>();

        unrecognized.forEach(unrec => {
            const productId = finalResolutions[unrec.originalName];
            if (productId) {
                if (!newIngredientsByElab.has(unrec.elaborationId)) {
                    newIngredientsByElab.set(unrec.elaborationId, []);
                }
                newIngredientsByElab.get(unrec.elaborationId)!.push({
                    productId: productId,
                    quantity: unrec.quantity,
                    unit: unrec.unit
                });
            }
        });

        const finalElaborations = partiallyMappedRecipe.elaborations.map(elab => {
            const newIngredients = newIngredientsByElab.get(elab.id) || [];
            return {
                ...elab,
                ingredients: [...elab.ingredients, ...newIngredients]
            };
        });

        const finalRecipeData = { ...partiallyMappedRecipe, elaborations: finalElaborations };

        setSelectedRecipe(finalRecipeData as Recipe);
        setView('form');
        setReconciliationState(null);
    };

    const filteredRecipes = useMemo(() => {
        return recipes.filter(r => 
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [recipes, searchTerm]);

    const latestRecipes = useMemo(() => {
        return [...recipes]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10);
    }, [recipes]);

    if (view === 'form') {
        return (
          <RecipeFormView
            initialRecipe={selectedRecipe}
            products={products}
            recipeCategories={allRecipeCategories}
            onSave={handleSaveRecipe}
            onCancel={handleCancelForm}
            onAddNewProduct={handleAddNewProduct}
          />
        );
    }
    
    return (
        <>
            {isPromptModalOpen && <TemplatePromptModal onClose={() => setIsPromptModalOpen(false)} />}
            {reconciliationState && (
                <IngredientReconciliationModal 
                    state={reconciliationState}
                    setState={setReconciliationState}
                    products={products}
                    onFinalize={handleFinalizeReconciliation}
                    onCancel={() => setReconciliationState(null)}
                    onCreateNewProduct={(unrec) => setIsAddingProductFromModal(unrec)}
                />
            )}
            {isAddingProductFromModal && (
                 <AddProductModal 
                    initialName={isAddingProductFromModal.originalName}
                    onSave={(newProduct) => {
                        handleAddNewProduct(newProduct);
                        setReconciliationState(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                resolutions: {
                                    ...prev.resolutions,
                                    [isAddingProductFromModal.originalName]: newProduct.id,
                                }
                            }
                        });
                        setIsAddingProductFromModal(null);
                    }}
                    onCancel={() => setIsAddingProductFromModal(null)}
                />
            )}
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Mi Recetario</h2>
                        <p className="text-gray-500 mt-1">
                            <span className="font-semibold text-gray-700">{recipes.length}</span> fichas técnicas en total
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center">
                        <button onClick={handleShowPrompt} title="Generar Prompt para IA" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 rounded-lg transition-colors flex items-center">
                            <CodeBracketIcon className="h-5 w-5"/>
                        </button>
                        <button onClick={() => importInputRef.current?.click()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center">
                            <UploadIcon className="h-5 w-5 mr-2" />
                            Importar Ficha JSON
                        </button>
                        <input type="file" ref={importInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
                        <button onClick={handleAddNewRecipe} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Nueva Ficha
                        </button>
                    </div>
                </div>
            
                {latestRecipes.length > 0 && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Últimas Recetas Añadidas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {latestRecipes.map(recipe => (
                                <RecipeCard key={recipe.id} recipe={recipe} onSelect={() => handleEditRecipe(recipe)} />
                            ))}
                        </div>
                    </div>
                )}
                
                <div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Todas las Recetas</h3>
                    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o categoría..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {filteredRecipes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filteredRecipes.map(recipe => (
                            <RecipeCard key={recipe.id} recipe={recipe} onSelect={() => handleEditRecipe(recipe)} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-lg shadow-md">
                            <p className="text-gray-500">No se encontraron recetas con tu búsqueda.</p>
                            {recipes.length === 0 && (
                                <button onClick={handleAddNewRecipe} className="mt-4 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                    Crea tu primera receta
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MiRecetarioView;