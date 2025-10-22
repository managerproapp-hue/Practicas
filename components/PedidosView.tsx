import React, { useState, useEffect, useMemo } from 'react';
import { Service, Recipe, Product, MenusState, Menu, MenuApartado } from '../types';
import { downloadPdfWithTables, exportToExcel } from './printUtils';

// Helper function to safely parse JSON from localStorage
const safeJsonParse = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error parsing JSON from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

// Type for a single calculated order item
type PedidoItem = {
    productId: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
};

// Detailed view for a single service's order
const PedidoDetalle: React.FC<{
    service: Service;
    menu: Menu;
    recipes: Recipe[];
    products: Product[];
}> = ({ service, menu, recipes, products }) => {

    const [pedido, setPedido] = useState<PedidoItem[]>([]);

    useEffect(() => {
        const aggregatedIngredients: { [productId: string]: Omit<PedidoItem, 'productId'> } = {};
        
        const processApartado = (apartado: MenuApartado) => {
            for (const section in apartado) {
                // Ensure the value is an array before iterating
                if (Array.isArray(apartado[section])) {
                    for (const recipeId of apartado[section]) {
                        const recipe = recipes.find(r => r.id === recipeId);
                        if (!recipe || !recipe.servings) continue;

                        const multiplier = menu.pax / recipe.servings;
                        
                        recipe.elaborations.forEach(elab => {
                            elab.ingredients.forEach(ing => {
                                const product = products.find(p => p.id === ing.productId);
                                if (!product) return;

                                const calculatedQuantity = ing.quantity * multiplier;
                                if (aggregatedIngredients[product.id]) {
                                    aggregatedIngredients[product.id].quantity += calculatedQuantity;
                                } else {
                                    aggregatedIngredients[product.id] = {
                                        name: product.name,
                                        category: product.category,
                                        quantity: calculatedQuantity,
                                        unit: product.unit
                                    };
                                }
                            });
                        });
                    }
                }
            }
        };

        processApartado(menu.comedor);
        processApartado(menu.takeaway);
        
        const pedidoArray = Object.entries(aggregatedIngredients).map(([productId, data]) => ({
            productId,
            ...data
        }));
        
        setPedido(pedidoArray);

    }, [menu, recipes, products]);

    const handleQuantityChange = (productId: string, newQuantity: number) => {
        setPedido(prev => prev.map(item => item.productId === productId ? {...item, quantity: newQuantity} : item));
    };

    const pedidoByCategory = useMemo(() => {
        const grouped: { [category: string]: PedidoItem[] } = {};
        pedido.forEach(item => {
            if (!grouped[item.category]) {
                grouped[item.category] = [];
            }
            grouped[item.category].push(item);
        });
        return Object.entries(grouped).sort(([catA], [catB]) => catA.localeCompare(catB));
    }, [pedido]);
    
    const handleDownloadPdf = () => {
        const tables = pedidoByCategory.map(([category, items]) => {
            const head = [['Producto', 'Cantidad', 'Unidad']];
            const body = items
                .sort((a,b) => a.name.localeCompare(b.name))
                .map(item => [item.name, item.quantity.toFixed(3), item.unit]);
            
            const columnStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 } };

            return {
                head: [[{ content: category, colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: '#f0f9ff' } }]],
                body: [...head, ...body],
                columnStyles: columnStyles,
                options: {
                    theme: 'grid'
                }
            };
        });

        downloadPdfWithTables(
            `Pedido para: ${service.name} (${new Date(service.date).toLocaleDateString()}) - ${menu.pax} PAX`, 
            `pedido_${service.name.replace(/\s+/g, '_')}`, 
            tables
        );
    };

    const handleExport = () => {
        const dataToExport = pedido.sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)).map(item => ({
            'Categoría': item.category,
            'Producto': item.name,
            'Cantidad': parseFloat(item.quantity.toFixed(3)),
            'Unidad': item.unit,
        }));
        exportToExcel(dataToExport, `pedido_${service.name.replace(/\s+/g, '_')}`, 'Pedido');
    };

    return (
        <div className="bg-gray-50 rounded-b-lg p-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Pedido para {menu.pax} PAX</h3>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="px-4 py-1.5 bg-green-500 text-white font-bold text-sm rounded-md hover:bg-green-600">Exportar Excel</button>
                    <button onClick={handleDownloadPdf} className="px-4 py-1.5 bg-blue-500 text-white font-bold text-sm rounded-md hover:bg-blue-600">Descargar PDF</button>
                </div>
             </div>
             <div id={`printable-pedido-${service.id}`}>
                 <div className="space-y-6 print-content">
                    {pedidoByCategory.length > 0 ? pedidoByCategory.map(([category, items]) => (
                        <div key={category} className="mb-6 last:mb-0 break-inside-avoid">
                            <h4 className="text-lg font-bold text-teal-700 bg-teal-50 px-3 py-2 rounded-md border-b-2 border-teal-200">{category}</h4>
                            <table className="min-w-full mt-2 text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 px-3 text-left font-medium text-gray-600 w-3/5">Producto</th>
                                        <th className="py-2 px-3 text-left font-medium text-gray-600 w-1/5">Cantidad</th>
                                        <th className="py-2 px-3 text-left font-medium text-gray-600 w-1/5">Unidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {items.sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                                    <tr key={item.productId} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 px-3">{item.name}</td>
                                        <td className="py-2 px-3">
                                            <input 
                                                type="number" 
                                                value={parseFloat(item.quantity.toFixed(3))} 
                                                onChange={e => handleQuantityChange(item.productId, parseFloat(e.target.value) || 0)}
                                                className="w-24 p-1 border rounded-md"
                                            />
                                        </td>
                                        <td className="py-2 px-3 text-gray-600">{item.unit}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )) : <p className="text-center text-gray-500 italic py-8">No hay ingredientes en este menú para generar un pedido.</p>}
                </div>
             </div>
        </div>
    );
};


// Main component for the "Pedidos" tab
const PedidosView: React.FC = () => {
    // Load all necessary data from localStorage
    const [services, setServices] = useState<Service[]>(() => safeJsonParse('practicaServices', []));
    const [recipes, setRecipes] = useState<Recipe[]>(() => safeJsonParse('cocina-mi-recetario', []));
    const [products, setProducts] = useState<Product[]>(() => safeJsonParse('cocina-catalogo-productos', []));
    const [menus, setMenus] = useState<MenusState>(() => safeJsonParse('cocina-menus', {}));

    const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

    // Sync with storage changes from other tabs
    useEffect(() => {
        const syncData = () => {
            setServices(safeJsonParse('practicaServices', []));
            setRecipes(safeJsonParse('cocina-mi-recetario', []));
            setProducts(safeJsonParse('cocina-catalogo-productos', []));
            setMenus(safeJsonParse('cocina-menus', {}));
        };
        window.addEventListener('storage', syncData);
        // Initial sync on mount as well
        syncData(); 
        return () => window.removeEventListener('storage', syncData);
    }, []);

    const sortedServices = useMemo(() => {
      return [...services].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [services]);

    const getMenuForService = (serviceId: string): Menu => {
        return menus[serviceId] || { pax: 0, comedor: {}, takeaway: {} };
    };

    const toggleServiceExpansion = (serviceId: string) => {
        setExpandedServiceId(prevId => prevId === serviceId ? null : serviceId);
    };

    if (services.length === 0) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h2 className="text-2xl font-bold text-gray-800">No hay servicios configurados</h2>
                <p className="mt-4 text-gray-600">Crea servicios en "Gestión Práctica" y define sus menús en "Creación de Menús" para poder generar pedidos.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800">Generación de Pedidos por Servicio</h2>
                <p className="mt-2 text-gray-600">Selecciona un servicio para ver, ajustar e imprimir la lista de la compra necesaria según el menú y el número de comensales (PAX) definidos.</p>
             </div>
            
            <div className="space-y-2">
                {sortedServices.map(service => {
                    const menu = getMenuForService(service.id);
                    const isOpen = expandedServiceId === service.id;
                    return (
                        <div key={service.id} className={`bg-white rounded-lg shadow-sm transition-all ${isOpen ? 'ring-2 ring-teal-500' : ''}`}>
                            <div 
                                className="p-4 flex justify-between items-center cursor-pointer"
                                onClick={() => toggleServiceExpansion(service.id)}
                            >
                                <div>
                                    <h3 className="font-bold text-lg">{service.name}</h3>
                                    <span className="text-sm text-gray-500">{new Date(service.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="text-sm font-semibold">PAX: {menu.pax}</span>
                                    <button className="text-teal-600 font-bold">
                                        {isOpen ? 'Ocultar Pedido' : 'Ver Pedido'}
                                    </button>
                                </div>
                            </div>
                            {isOpen && (
                                <PedidoDetalle 
                                    service={service}
                                    menu={menu}
                                    recipes={recipes}
                                    products={products}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PedidosView;