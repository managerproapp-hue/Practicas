import React, { useState } from 'react';
import { CocinaSubView } from '../types';
import CatalogoProductosView from './CatalogoProductosView';
import MiRecetarioView from './MiRecetarioView';
import CreacionMenusView from './CreacionMenusView';
import PedidosView from './PedidosView';

const CocinaView: React.FC = () => {
  const [activeSubView, setActiveSubView] = useState<CocinaSubView>('Productos');

  const renderContent = () => {
    switch (activeSubView) {
      case 'Productos':
        return <CatalogoProductosView />;
      case 'Mi Recetario':
        return <MiRecetarioView />;
      case 'Creación de Menús':
        return <CreacionMenusView />;
      case 'Pedidos':
        return <PedidosView />;
      default:
        return null;
    }
  };

  const subNavItems: CocinaSubView[] = ['Productos', 'Mi Recetario', 'Creación de Menús', 'Pedidos'];

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Módulo de Cocina</h1>
        <p className="mt-2 text-gray-600">Gestión centralizada de productos, pedidos, recetas y menús.</p>
      </header>
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {subNavItems.map(item => (
            <button
              key={item}
              onClick={() => setActiveSubView(item)}
              className={`flex-shrink-0 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeSubView === item
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default CocinaView;