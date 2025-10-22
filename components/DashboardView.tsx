import React, { useMemo } from 'react';
import { Student, EvaluationsState, NavItemType, Annotation } from '../types';
import { UsersIcon, ClipboardIcon, PlusIcon, KitchenIcon } from './icons';

interface Service {
  id: string;
  name: string;
  date: string;
  trimestre: number;
}

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


interface DashboardViewProps {
    students: Student[];
    evaluations: EvaluationsState;
    setActiveView: (view: NavItemType) => void;
}

const getAnnotationColor = (type: Annotation['type']) => {
  switch (type) {
    case 'positive': return 'bg-green-100 text-green-800';
    case 'negative': return 'bg-red-100 text-red-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

const DashboardView: React.FC<DashboardViewProps> = ({ students, setActiveView }) => {
    
    const stats = useMemo(() => {
        const totalStudents = students.length;
        const groups = new Set(students.map(s => s.grupo));
        const totalGroups = groups.size;
        return { totalStudents, totalGroups };
    }, [students]);

    const upcomingServices = useMemo(() => {
        const services = safeJsonParse<Service[]>('practicaServices', []);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        return services
            .filter(service => new Date(service.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3);
    }, []);

    const recentAnnotations = useMemo(() => {
        return students
            .flatMap(student => 
                (student.anotaciones || []).map(annotation => ({
                    ...annotation,
                    studentName: `${student.nombre} ${student.apellido1}`
                }))
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [students]);

    const quickLinks: { name: string, view: NavItemType, icon: React.ReactNode }[] = [
        { name: "Añadir Alumno", view: "Alumnos", icon: <PlusIcon className="h-6 w-6"/> },
        { name: "Planificar Servicio", view: "Gestión Práctica", icon: <ClipboardIcon className="h-6 w-6"/> },
        { name: "Ver Alumnos", view: "Alumnos", icon: <UsersIcon className="h-6 w-6"/> },
        { name: "Crear Receta", view: "Cocina", icon: <KitchenIcon className="h-6 w-6" /> }
    ];
    
    return (
        <div className="p-8 bg-gray-50 min-h-full">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Panel Principal</h1>
                <p className="mt-2 text-gray-600">Bienvenido de nuevo. Aquí tienes un resumen de tu actividad reciente.</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="bg-teal-100 p-3 rounded-full">
                        <UsersIcon />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Total Alumnos</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                     <div className="bg-blue-100 p-3 rounded-full">
                        <UsersIcon className="text-blue-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Total Grupos</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.totalGroups}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                     <div className="bg-yellow-100 p-3 rounded-full">
                        <ClipboardIcon className="text-yellow-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Próximos Servicios</p>
                        <p className="text-2xl font-bold text-gray-800">{upcomingServices.length}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Services */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Próximos Servicios</h2>
                    <div className="space-y-4">
                        {upcomingServices.length > 0 ? (
                            upcomingServices.map(service => (
                                <div key={service.id} className="p-3 bg-gray-50 rounded-md border-l-4 border-teal-400">
                                    <p className="font-semibold text-gray-800">{service.name}</p>
                                    <p className="text-sm text-gray-500">{new Date(service.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            ))
                        ) : (
                             <p className="text-sm text-gray-500 italic">No hay servicios programados próximamente.</p>
                        )}
                    </div>
                </div>

                {/* Recent Annotations */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold text-gray-800 mb-4">Anotaciones Recientes</h2>
                     <div className="space-y-3">
                        {recentAnnotations.length > 0 ? (
                            recentAnnotations.map(anno => (
                                <div key={anno.id} className="flex items-start p-2 rounded-md">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full self-center ${getAnnotationColor(anno.type)}`}>{anno.type.charAt(0).toUpperCase()}</span>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm text-gray-800">{anno.note}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            <span className="font-semibold">{anno.studentName}</span> - {new Date(anno.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic">No hay anotaciones recientes.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Links */}
             <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickLinks.map(link => (
                        <button key={link.name} onClick={() => setActiveView(link.view)} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg hover:bg-teal-50 transition-all flex flex-col items-center justify-center text-center">
                            <div className="text-teal-500 mb-2">{React.cloneElement(link.icon as React.ReactElement, { className: "h-6 w-6" })}</div>
                            <span className="font-semibold text-gray-700">{link.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
