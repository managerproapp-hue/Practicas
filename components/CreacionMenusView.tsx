import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Service, Recipe, Product, MenusState, Menu, MenuApartado } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon } from './icons';

// --- HELPER FUNCTIONS ---
const safeJsonParse = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error parsing JSON from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

const DEFAULT_COMEDOR_SECTIONS = ["Aperitivo", "Entrantes", "Pescados", "Carnes", "Postres"];
const DEFAULT_TAKEAWAY_SECTIONS = ["Bocadillos", "Raciones", "Bebidas"];

// --- SUB-COMPONENTS ---
const MenuSection: React.FC<{
    title: string;
    apartado: MenuApartado;
    allRecipes: Recipe[];
    onUpdate: (newApartado: MenuApartado) => void;
}> = ({ title, apartado, allRecipes, onUpdate }) => {
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [newSectionName, setNewSectionName] = useState('');
    const [search, setSearch] = useState<{ section: string; term: string }>({ section: '', term: '' });

    const handleAddSection = () => {
        const name = prompt("Nombre del nuevo apartado:");
        if (name && !apartado[name]) {
            onUpdate({ ...apartado, [name]: [] });
        }
    };

    const handleRenameSection = (oldName: string) => {
        if (newSectionName && !apartado[newSectionName] && oldName !== newSectionName) {
            const newApartado = { ...apartado };
            newApartado[newSectionName] = newApartado[oldName];
            delete newApartado[oldName];
            onUpdate(newApartado);
        }
        setEditingSection(null);
        setNewSectionName('');
    };
    
    const handleDeleteSection = (name: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar el apartado "${name}"?`)) {
            const newApartado = { ...apartado };
            delete newApartado[name];
            onUpdate(newApartado);
        }
    };
    
    const handleAddRecipe = (section: string, recipeId: string) => {
        if (!apartado[section].includes(recipeId)) {
            const newApartado = { ...apartado, [section]: [...apartado[section], recipeId] };
            onUpdate(newApartado);
        }
        setSearch({ section: '', term: '' });
    };

    const handleRemoveRecipe = (section: string, recipeId: string) => {
        const newApartado = { ...apartado, [section]: apartado[section].filter(id => id !== recipeId) };
        onUpdate(newApartado);
    };

    const searchResults = useMemo(() => {
        if (!search.term) return [];
        const currentRecipeIds = Object.values(apartado).flat();
        return allRecipes.filter(r => 
            r.name.toLowerCase().includes(search.term.toLowerCase()) && !currentRecipeIds.includes(r.id)
        ).slice(0, 5);
    }, [search, allRecipes, apartado]);

    return (
        <div className="bg-gray-50 p-4 rounded-lg border flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-4 pr-2">
                {Object.entries(apartado).map(([sectionName, recipeIds]) => (
                    <div key={sectionName} className="bg-white p-3 rounded-md shadow-sm">
                         <div className="flex justify-between items-center mb-2">
                            {editingSection === sectionName ? (
                                <input 
                                    type="text" 
                                    value={newSectionName}
                                    onChange={e => setNewSectionName(e.target.value)}
                                    onBlur={() => handleRenameSection(sectionName)}
                                    onKeyPress={e => e.key === 'Enter' && handleRenameSection(sectionName)}
                                    className="font-semibold text-gray-700 p-1 border rounded" autoFocus />
                            ) : (
                                <h4 className="font-semibold text-gray-700 flex items-center">{sectionName}
                                  <button onClick={() => { setEditingSection(sectionName); setNewSectionName(sectionName);}} className="ml-2 text-gray-400 hover:text-blue-600"><PencilIcon className="h-4 w-4"/></button>
                                </h4>
                            )}
                            <button onClick={() => handleDeleteSection(sectionName)} className="text-gray-400 hover:text-red-600"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                        <div className="space-y-2">
                            {Array.isArray(recipeIds) && recipeIds.map(id => {
                                const recipe = allRecipes.find(r => r.id === id);
                                return (
                                <div key={id} className="flex justify-between items-center text-sm bg-gray-50 p-1.5 rounded">
                                    <span>{recipe?.name || 'Receta no encontrada'}</span>
                                    <button onClick={() => handleRemoveRecipe(sectionName, id)}>&times;</button>
                                </div>
                                );
                            })}
                        </div>
                         <div className="relative mt-2">
                            <input type="text" placeholder="+ Añadir plato..." value={search.section === sectionName ? search.term : ''} onChange={e => setSearch({section: sectionName, term: e.target.value})} className="w-full text-sm p-1 border rounded" />
                            {search.section === sectionName && search.term && (
                                <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1">
                                    {searchResults.length > 0 ? searchResults.map(r => (
                                        <div key={r.id} onClick={() => handleAddRecipe(sectionName, r.id)} className="p-2 text-sm hover:bg-gray-100 cursor-pointer">{r.name}</div>
                                    )) : <div className="p-2 text-sm text-gray-500 italic">No se encontraron recetas.</div>}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
             <button onClick={handleAddSection} className="w-full mt-4 text-sm text-center py-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300">
                <PlusIcon className="h-4 w-4 inline mr-1"/> Añadir Apartado
            </button>
        </div>
    )
};


// --- MAIN VIEW COMPONENT ---

const CreacionMenusView: React.FC = () => {
    const [services, setServices] = useState<Service[]>(() => safeJsonParse('practicaServices', []));
    const [recipes, setRecipes] = useState<Recipe[]>(() => safeJsonParse('cocina-mi-recetario', []));
    const [menus, setMenus] = useState<MenusState>(() => safeJsonParse('cocina-menus', {}));
    
    useEffect(() => {
        localStorage.setItem('cocina-menus', JSON.stringify(menus));
    }, [menus]);

    useEffect(() => {
        // Sync menus state with existing services. Remove menus for deleted services.
        const serviceIds = new Set(services.map(s => s.id));
        const currentMenuIds = Object.keys(menus);
        const menusToDelete = currentMenuIds.filter(id => !serviceIds.has(id));

        if (menusToDelete.length > 0) {
            const newMenus = { ...menus };
            menusToDelete.forEach(id => {
                delete newMenus[id];
            });
            setMenus(newMenus);
        }
    }, [services, menus]);
    
    const getMenuForService = useCallback((serviceId: string): Menu => {
        if (menus[serviceId]) return menus[serviceId];
        
        const comedor = DEFAULT_COMEDOR_SECTIONS.reduce((acc, section) => ({...acc, [section]: []}), {} as MenuApartado);
        const takeaway = DEFAULT_TAKEAWAY_SECTIONS.reduce((acc, section) => ({...acc, [section]: []}), {} as MenuApartado);

        return { pax: 20, comedor, takeaway };
    }, [menus]);

    const handleUpdateMenu = (serviceId: string, updatedMenu: Partial<Menu>) => {
        setMenus(prev => ({
            ...prev,
            [serviceId]: { ...getMenuForService(serviceId), ...updatedMenu }
        }));
    };
    
    const sortedServices = useMemo(() => {
      return [...services].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [services]);

    if(services.length === 0) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h2 className="text-2xl font-bold text-gray-800">No hay servicios configurados</h2>
                <p className="mt-4 text-gray-600">Por favor, ve a "Gestión Práctica" {'>'} "Configuración" para añadir servicios antes de crear menús.</p>
          </div>
        )
    }

    return (
        <div className="space-y-4">
            {sortedServices.map(service => {
                const menu = getMenuForService(service.id);
                return (
                    <details key={service.id} className="bg-white rounded-lg shadow-md open:ring-2 open:ring-teal-500 transition">
                        <summary className="p-4 font-bold text-lg cursor-pointer flex justify-between items-center">
                            <div>
                                {service.name}
                                <span className="ml-4 font-normal text-sm text-gray-500">{new Date(service.date).toLocaleDateString()}</span>
                            </div>
                        </summary>
                        <div className="p-4 border-t space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <label htmlFor={`pax-${service.id}`} className="font-semibold text-gray-700">Número de PAX:</label>
                                    <input 
                                        type="number" 
                                        id={`pax-${service.id}`}
                                        value={menu.pax}
                                        onChange={e => handleUpdateMenu(service.id, { pax: parseInt(e.target.value, 10) || 0 })}
                                        min="1"
                                        className="w-24 p-1.5 border rounded-md"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <MenuSection 
                                    title="Menú Comedor" 
                                    apartado={menu.comedor}
                                    allRecipes={recipes}
                                    onUpdate={(newComedor) => handleUpdateMenu(service.id, { comedor: newComedor })}
                                />
                                <MenuSection 
                                    title="Menú Takeaway" 
                                    apartado={menu.takeaway}
                                    allRecipes={recipes}
                                    onUpdate={(newTakeaway) => handleUpdateMenu(service.id, { takeaway: newTakeaway })}
                                />
                            </div>
                        </div>
                    </details>
                )
            })}
        </div>
    );
};

export default CreacionMenusView;