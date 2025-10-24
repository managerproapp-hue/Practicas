import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Student, Service, PlanningAssignments, StudentGroupAssignments } from '../types';
import { GroupIcon, CogIcon, ServiceIcon, CalendarIcon, TrashIcon, PlusIcon, ViewGridIcon, CheckIcon } from './icons';

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

const uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

const LEADER_ROLES = ["Jefe de Cocina", "2º Jefe de Cocina", "2º Jefe de Takeaway"];
const SECONDARY_ROLES = ["Jefe de Partida", "Cocinero", "Ayudante", "Sin servicio 1", "Sin servicio 2"];
const ALL_ROLES = ["Sin asignar", ...LEADER_ROLES, ...SECONDARY_ROLES];
type SubView = 'grupos' | 'configuracion' | 'servicios' | 'planning' | 'vision';


// --- SUB-COMPONENT: Partidas y Grupos ---
const PartidasGruposView: React.FC<{
    students: Student[];
    practicaGroups: string[];
    setPracticaGroups: React.Dispatch<React.SetStateAction<string[]>>;
    studentAssignments: StudentGroupAssignments;
    setStudentAssignments: React.Dispatch<React.SetStateAction<StudentGroupAssignments>>;
}> = ({ students, practicaGroups, setPracticaGroups, studentAssignments, setStudentAssignments }) => {
    
    const unassignedStudents = useMemo(() => {
        const assignedNres = new Set(Object.keys(studentAssignments));
        return students.filter(s => !assignedNres.has(s.nre));
    }, [students, studentAssignments]);

    const handleCreateGroup = () => {
        const groupName = prompt("Nombre del nuevo grupo de prácticas (ej. Grupo 1):");
        if (groupName && !practicaGroups.includes(groupName)) {
            setPracticaGroups(prev => [...prev, groupName]);
        }
    };

    const handleDeleteGroup = (groupName: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar el grupo "${groupName}"? Los alumnos asignados quedarán libres.`)) {
            setPracticaGroups(prev => prev.filter(g => g !== groupName));
            setStudentAssignments(prev => {
                const newAssignments = { ...prev };
                Object.keys(newAssignments).forEach(nre => {
                    if (newAssignments[nre] === groupName) {
                        delete newAssignments[nre];
                    }
                });
                return newAssignments;
            });
        }
    };

    const handleAssignStudent = (studentNre: string, groupName: string) => {
        setStudentAssignments(prev => ({...prev, [studentNre]: groupName }));
    };

    const handleUnassignStudent = (studentNre: string) => {
         setStudentAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[studentNre];
            return newAssignments;
        });
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {practicaGroups.map(group => (
                <div key={group} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg">{group}</h3>
                        <button onClick={() => handleDeleteGroup(group)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                    <div className="space-y-2 min-h-[100px]">
                        {students.filter(s => studentAssignments[s.nre] === group).map(s => (
                             <div key={s.nre} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                                <span>{s.apellido1}, {s.nombre}</span>
                                <button onClick={() => handleUnassignStudent(s.nre)} className="text-gray-400 hover:text-red-600 font-bold">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
             <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-bold text-lg text-gray-700 mb-3">Alumnos sin asignar</h3>
                 <div className="space-y-2">
                    {unassignedStudents.map(s => (
                         <div key={s.nre} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm">
                            <span>{s.apellido1}, {s.nombre}</span>
                            <select onChange={(e) => handleAssignStudent(s.nre, e.target.value)} value="" className="text-xs p-1 rounded border">
                                <option value="" disabled>Asignar a...</option>
                                {practicaGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>
             <div>
                <button onClick={handleCreateGroup} className="w-full h-full bg-gray-100 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700">
                    <PlusIcon className="h-6 w-6 mr-2"/> Crear Grupo
                </button>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Servicios ---
const ServiciosView: React.FC<{
    services: Service[];
    setServices: React.Dispatch<React.SetStateAction<Service[]>>;
    practicaGroups: string[];
}> = ({ services, setServices, practicaGroups }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    const handleOpenModal = (service: Service | null = null) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleSaveService = (serviceData: Service) => {
        if (editingService) {
            setServices(prev => prev.map(s => s.id === serviceData.id ? serviceData : s));
        } else {
            setServices(prev => [...prev, serviceData]);
        }
        setIsModalOpen(false);
    };
    
    const handleDeleteService = (serviceId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar este servicio? Se borrarán también todas las asignaciones de roles asociadas.")) {
            setServices(prev => prev.filter(s => s.id !== serviceId));
        }
    };
    
    const sortedServices = useMemo(() => [...services].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [services]);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal()} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2"/> Nuevo Servicio
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedServices.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-lg shadow-md border">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{s.name}</h3>
                                <p className="text-sm text-gray-500">{new Date(s.date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <button onClick={() => handleOpenModal(s)} className="text-blue-600 mr-2">Editar</button>
                                <button onClick={() => handleDeleteService(s.id)} className="text-red-600">Borrar</button>
                            </div>
                        </div>
                        <div className="mt-3 text-sm">
                            <p><strong>Comedor:</strong> {s.groupAssignments.comedor.join(', ') || 'N/A'}</p>
                            <p><strong>Takeaway:</strong> {s.groupAssignments.takeaway.join(', ') || 'N/A'}</p>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && <ServiceModal service={editingService} allGroups={practicaGroups} onSave={handleSaveService} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

const ServiceModal: React.FC<{ service: Service | null, allGroups: string[], onSave: (service: Service) => void, onClose: () => void }> = ({ service, allGroups, onSave, onClose }) => {
    const [formData, setFormData] = useState<Omit<Service, 'id'>>({
        name: service?.name || '',
        date: service?.date ? service.date.split('T')[0] : new Date().toISOString().split('T')[0],
        trimestre: service?.trimestre || 1,
        groupAssignments: service?.groupAssignments || { comedor: [], takeaway: [] }
    });

    const handleGroupToggle = (type: 'comedor' | 'takeaway', group: string) => {
        setFormData(prev => {
            const currentAssignments = prev.groupAssignments[type];
            const newAssignments = currentAssignments.includes(group)
                ? currentAssignments.filter(g => g !== group)
                : [...currentAssignments, group];
            return { ...prev, groupAssignments: { ...prev.groupAssignments, [type]: newAssignments } };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: service?.id || uuidv4() });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">{service ? 'Editar' : 'Nuevo'} Servicio</h2>
                <input type="text" placeholder="Nombre (ej. Servicio Comida 1)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border rounded mb-2" />
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="w-full p-2 border rounded mb-2" />
                 <select value={formData.trimestre} onChange={e => setFormData({...formData, trimestre: parseInt(e.target.value)})} className="w-full p-2 border rounded bg-white mb-4">
                    <option value={1}>1º Trimestre</option>
                    <option value={2}>2º Trimestre</option>
                </select>
                <div>
                    <h4 className="font-semibold">Asignar Grupos a Comedor:</h4>
                    {allGroups.map(g => <label key={g} className="inline-flex items-center mr-4"><input type="checkbox" checked={formData.groupAssignments.comedor.includes(g)} onChange={() => handleGroupToggle('comedor', g)} className="mr-1"/>{g}</label>)}
                </div>
                 <div className="mt-2">
                    <h4 className="font-semibold">Asignar Grupos a Takeaway:</h4>
                    {allGroups.map(g => <label key={g} className="inline-flex items-center mr-4"><input type="checkbox" checked={formData.groupAssignments.takeaway.includes(g)} onChange={() => handleGroupToggle('takeaway', g)} className="mr-1"/>{g}</label>)}
                </div>
            </div>
            <div className="bg-gray-100 px-6 py-3 flex justify-end gap-4">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-teal-500 text-white rounded">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    );
};


// --- SUB-COMPONENT: Planning / Visión Total ---
const PlanningGrid: React.FC<{
    students: Student[];
    services: Service[];
    assignments: PlanningAssignments;
    onRoleChange: (serviceId: string, studentNre: string, newRole: string) => void;
    groupBy?: 'group' | 'none';
    studentGroupAssignments?: StudentGroupAssignments;
}> = ({ students, services, assignments, onRoleChange, groupBy = 'none', studentGroupAssignments = {} }) => {
    
    const studentsByGroup = useMemo(() => {
        if (groupBy !== 'group') return [['Todos', students]];
        
        const grouped: { [key: string]: Student[] } = {};
        students.forEach(s => {
            const groupName = studentGroupAssignments[s.nre] || 'Sin Grupo Asignado';
            if (!grouped[groupName]) grouped[groupName] = [];
            grouped[groupName].push(s);
        });
        
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [students, groupBy, studentGroupAssignments]);

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[75vh]">
            <table className="min-w-full divide-y divide-gray-200 text-sm border-separate" style={{ borderSpacing: 0 }}>
                <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                        <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 z-30 border-b border-r">Alumno</th>
                        {services.map(service => (
                            <th key={service.id} className="px-3 py-3 text-center font-semibold text-gray-600 whitespace-nowrap border-b border-r">
                                {service.name} <br />
                                <span className="font-normal text-xs">{new Date(service.date).toLocaleDateString()}</span>
                                {groupBy === 'group' && (
                                     <div className="mt-1 flex flex-col items-center gap-1 text-xs">
                                        <div className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium">C: {service.groupAssignments.comedor.join(', ')}</div>
                                        <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">T: {service.groupAssignments.takeaway.join(', ')}</div>
                                    </div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {studentsByGroup.map(([groupName, groupStudents]) => (
                        <React.Fragment key={groupName}>
                            {groupBy === 'group' && (
                                <tr>
                                    <td colSpan={services.length + 1} className="sticky left-0 px-4 py-2 bg-gray-100 text-sm font-bold text-gray-700 z-10">{groupName}</td>
                                </tr>
                            )}
                            {groupStudents.map(student => (
                                <tr key={student.nre} className="hover:bg-gray-50">
                                    <td className="sticky left-0 bg-white hover:bg-gray-50 px-3 py-2 font-medium text-gray-800 whitespace-nowrap z-10 border-b border-r">
                                        {student.apellido1} {student.apellido2}, {student.nombre}
                                    </td>
                                    {services.map(service => {
                                        const currentRole = assignments[service.id]?.[student.nre] || "Sin asignar";
                                        return (
                                            <td key={service.id} className="px-2 py-1 border-b border-r">
                                                <select
                                                    value={currentRole}
                                                    onChange={e => onRoleChange(service.id, student.nre, e.target.value)}
                                                    className="w-full p-1.5 border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                >
                                                    {ALL_ROLES.map(role => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


// --- MAIN VIEW COMPONENT ---
const GestionPracticaView: React.FC<{ students: Student[] }> = ({ students }) => {
    const [activeSubView, setActiveSubView] = useState<SubView>('vision');
    
    // States for each module
    const [practicaGroups, setPracticaGroups] = useState<string[]>(() => safeJsonParse('practicaGroups', ['Grupo 1', 'Grupo 2', 'Grupo 3']));
    const [studentGroupAssignments, setStudentGroupAssignments] = useState<StudentGroupAssignments>(() => safeJsonParse('studentGroupAssignments', {}));
    const [services, setServices] = useState<Service[]>(() => safeJsonParse('practicaServices', []));
    const [planningAssignments, setPlanningAssignments] = useState<PlanningAssignments>(() => safeJsonParse('planningAssignments', {}));

    // Automatic saving effects
    useEffect(() => { localStorage.setItem('practicaGroups', JSON.stringify(practicaGroups)); }, [practicaGroups]);
    useEffect(() => { localStorage.setItem('studentGroupAssignments', JSON.stringify(studentGroupAssignments)); }, [studentGroupAssignments]);
    useEffect(() => { localStorage.setItem('practicaServices', JSON.stringify(services)); }, [services]);
    useEffect(() => { localStorage.setItem('planningAssignments', JSON.stringify(planningAssignments)); }, [planningAssignments]);

    const handleRoleChange = (serviceId: string, studentNre: string, newRole: string) => {
      setPlanningAssignments(prev => {
          const newAssignments = JSON.parse(JSON.stringify(prev)); // Deep copy for safety
          const serviceAssignments = newAssignments[serviceId] || {};
          
          if (LEADER_ROLES.includes(newRole)) {
              // Unassign the role if another student already has it
              Object.keys(serviceAssignments).forEach(nre => {
                  if (serviceAssignments[nre] === newRole) {
                      delete serviceAssignments[nre];
                  }
              });
          }
          
          if (newRole === "Sin asignar") {
              delete serviceAssignments[studentNre];
          } else {
              serviceAssignments[studentNre] = newRole;
          }
          
          newAssignments[serviceId] = serviceAssignments;
          return newAssignments;
      });
    };
    
    const sortedStudents = useMemo(() => [...students].sort((a, b) => 
        `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`)), 
    [students]);

    const sortedServices = useMemo(() => [...services].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()),
    [services]);

    const renderContent = () => {
        switch (activeSubView) {
            case 'grupos':
                return <PartidasGruposView students={students} practicaGroups={practicaGroups} setPracticaGroups={setPracticaGroups} studentAssignments={studentGroupAssignments} setStudentAssignments={setStudentGroupAssignments} />;
            case 'servicios':
                return <ServiciosView services={services} setServices={setServices} practicaGroups={practicaGroups} />;
            case 'planning':
                 return <PlanningGrid students={sortedStudents} services={sortedServices} assignments={planningAssignments} onRoleChange={handleRoleChange} />;
            case 'vision':
                 return <PlanningGrid students={sortedStudents} services={sortedServices} assignments={planningAssignments} onRoleChange={handleRoleChange} groupBy="group" studentGroupAssignments={studentGroupAssignments} />;
            case 'configuracion':
                return <div className="text-center p-8 bg-gray-50 rounded-lg">Configuración de roles y otros parámetros (Próximamente).</div>;
            default:
                return null;
        }
    };

    const tabs: { id: SubView, name: string, icon: React.ReactNode }[] = [
        { id: 'grupos', name: 'Partidas y Grupos', icon: <GroupIcon className="h-5 w-5 mr-2" /> },
        { id: 'servicios', name: 'Servicios', icon: <ServiceIcon className="h-5 w-5 mr-2" /> },
        { id: 'planning', name: 'Planning', icon: <CalendarIcon className="h-5 w-5 mr-2" /> },
        { id: 'vision', name: 'Visión Total', icon: <ViewGridIcon className="h-5 w-5 mr-2" /> },
        { id: 'configuracion', name: 'Configuración', icon: <CogIcon className="h-5 w-5 mr-2" /> },
    ];

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión Práctica</h1>
                <p className="mt-2 text-gray-600">Organiza los grupos de prácticas, define los servicios y asigna roles a los alumnos.</p>
            </header>
            
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveSubView(tab.id)}
                            className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                activeSubView === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon} {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                {renderContent()}
            </div>
        </div>
    );
};

export default GestionPracticaView;
