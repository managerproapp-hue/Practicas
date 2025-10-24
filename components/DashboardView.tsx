import React, { useMemo } from 'react';
import { Student, EvaluationsState, NavItemType, Annotation } from '../types';
import { UsersIcon, ClipboardIcon, PlusIcon, CalendarIcon } from './icons';

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
            .slice(0, 5);
    }, []);

    const recentAnnotations = useMemo(() => {
        return students
            .flatMap(student => 
                (student.anotaciones || []).map(annotation => ({
                    ...annotation,
                    studentName: `${student.nombre} ${student.apellido1}`,
                    studentPhotoUrl: student.photoUrl,
                    studentNre: student.nre
                }))
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [students]);

    const quickLinks: { name: string, description: string, view: NavItemType, icon: React.ReactNode }[] = [
        { name: "Añadir Alumno", description: "Incorpora un nuevo estudiante al sistema.", view: "Alumnos", icon: <PlusIcon/> },
        { name: "Planificar Servicio", description: "Configura grupos y roles para las prácticas.", view: "Gestión Práctica", icon: <ClipboardIcon /> },
        { name: "Ver Alumnos", description: "Consulta y gestiona las fichas de los estudiantes.", view: "Alumnos", icon: <UsersIcon /> },
    ];
    
    return (
        <div className="p-8 bg-gray-50 min-h-full">
            <header className="mb-8">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-600">
                    Panel Principal
                </h1>
                <p className="mt-2 text-gray-600">Bienvenido de nuevo. Aquí tienes un resumen de tu actividad reciente.</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div className="bg-teal-100 p-4 rounded-full">
                        <UsersIcon className="h-8 w-8 text-teal-600"/>
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Total Alumnos</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                     <div className="bg-blue-100 p-4 rounded-full">
                        <UsersIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Total Grupos</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.totalGroups}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                     <div className="bg-yellow-100 p-4 rounded-full">
                        <ClipboardIcon className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Próximos Servicios</p>
                        <p className="text-3xl font-bold text-gray-800">{upcomingServices.length}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Quick Links */}
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos Rápidos</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {quickLinks.map(link => (
                                <button key={link.name} onClick={() => setActiveView(link.view)} className="bg-white p-4 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-gray-100 p-3 rounded-lg text-teal-600">
                                            {React.cloneElement(link.icon as React.ReactElement, { className: "h-6 w-6" })}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{link.name}</p>
                                            <p className="text-sm text-gray-500 mt-1">{link.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Upcoming Services */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Próximos Servicios</h2>
                        <div className="space-y-4">
                            {upcomingServices.length > 0 ? (
                                upcomingServices.map(service => (
                                    <div key={service.id} className="flex items-start gap-4">
                                        <div className="bg-teal-100 p-3 rounded-lg mt-1">
                                            <CalendarIcon className="h-5 w-5 text-teal-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{service.name}</p>
                                            <p className="text-sm text-gray-500">{new Date(service.date).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                 <p className="text-sm text-gray-500 italic mt-4">No hay servicios programados próximamente.</p>
                            )}
                        </div>
                    </div>
                    <div>{/* Placeholder for future content */}</div>
                </div>
                {/* Recent Annotations */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold text-gray-800 mb-4">Anotaciones Recientes</h2>
                     <div className="space-y-4">
                        {recentAnnotations.length > 0 ? (
                            recentAnnotations.map(anno => (
                                <div key={anno.id} className="flex items-start gap-3">
                                    <img 
                                        src={anno.studentPhotoUrl || `https://i.pravatar.cc/150?u=${anno.studentNre}`} 
                                        alt={anno.studentName}
                                        className="h-10 w-10 rounded-full flex-shrink-0"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-800 leading-snug">
                                            <span className={`font-semibold px-1.5 py-0.5 rounded-md text-xs mr-1 ${getAnnotationColor(anno.type)}`}>{anno.type}</span>
                                            {anno.note}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            <span className="font-semibold">{anno.studentName}</span> &middot; {new Date(anno.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic mt-4">No hay anotaciones recientes.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;