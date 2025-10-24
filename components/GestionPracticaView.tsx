import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Student, Service, PlanningAssignments, StudentGroupAssignments, Role } from '../types';
import { GroupIcon, CogIcon, ServiceIcon, CalendarIcon, TrashIcon, PlusIcon, ViewGridIcon, CheckIcon, LockClosedIcon, DownloadIcon } from './icons';
import { downloadPlanningPdf } from './printUtils';

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

type SubView = 'grupos' | 'configuracion' | 'servicios' | 'planning' | 'vision';
const GROUP_COLORS = ['#e0f2f1', '#e3f2fd', '#e8f5e9', '#fff8e1', '#fce4ec', '#f3e5f5', '#ede7f6'];

// --- SUB-COMPONENT: Distribución de Grupos ---
const DistribucionGruposView: React.FC<{
    students: Student[];
    practicaGroups: string[];
    setPracticaGroups: React.Dispatch<React.SetStateAction<string[]>>;
    studentAssignments: StudentGroupAssignments;
    setStudentAssignments: React.Dispatch<React.SetStateAction<StudentGroupAssignments>>;
}> = ({ students, practicaGroups, setPracticaGroups, studentAssignments, setStudentAssignments }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = useMemo(() => {
        return students
            .filter(s => `${s.nombre} ${s.apellido1} ${s.apellido2}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [students, searchTerm]);
    
    const handleAddGroup = () => {
        const newGroupName = `Grupo ${practicaGroups.length + 1}`;
        if (!practicaGroups.includes(newGroupName)) {
            setPracticaGroups(prev => [...prev, newGroupName]);
        }
    };

    const handleDeleteGroup = (groupName: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar "${groupName}"? Los alumnos asignados quedarán libres.`)) {
            setPracticaGroups(prev => prev.filter(g => g !== groupName));
            setStudentAssignments(prev => {
                const newAssignments = { ...prev };
                Object.entries(newAssignments).forEach(([nre, group]) => {
                    if (group === groupName) {
                        delete newAssignments[nre];
                    }
                });
                return newAssignments;
            });
        }
    };

    const handleAssignStudent = (studentNre: string, groupName: string) => {
        setStudentAssignments(prev => ({ ...prev, [studentNre]: groupName }));
    };

    const handleUnassignStudent = (studentNre: string) => {
        setStudentAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[studentNre];
            return newAssignments;
        });
    };
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Distribución de Grupos y Alumnos</h2>
                <div className="flex gap-2">
                    <button onClick={handleAddGroup} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center">
                        <PlusIcon className="h-5 w-5 mr-2" /> Añadir Grupo
                    </button>
                    <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center">
                       <DownloadIcon className="h-5 w-5 mr-2" /> Exportar
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Students */}
                <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-bold text-lg mb-3">Alumnos y Participación</h3>
                    <input
                        type="text"
                        placeholder="Buscar alumno..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg mb-3"
                    />
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {filteredStudents.map((student, index) => (
                            <div key={student.nre} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                <div className="flex items-center">
                                    <span className="font-semibold text-gray-500 w-8">{index + 1}.</span>
                                    <img src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.nre}`} className="w-10 h-10 rounded-full mr-3" alt={student.nombre}/>
                                    <div>
                                        <p className="font-semibold text-sm">{student.apellido1} {student.apellido2}, {student.nombre}</p>
                                        <p className="text-xs text-gray-500">{student.grupo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={studentAssignments[student.nre] || "sin-grupo"}
                                        onChange={(e) => e.target.value === "sin-grupo" ? handleUnassignStudent(student.nre) : handleAssignStudent(student.nre, e.target.value)}
                                        className="text-sm p-1.5 rounded border bg-white"
                                    >
                                        <option value="sin-grupo">Sin grupo</option>
                                        {practicaGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <button onClick={() => handleUnassignStudent(student.nre)} className="text-gray-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Right Column: Groups */}
                <div className="p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-3">Vista de Grupos</h3>
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                        {practicaGroups.map((group, index) => {
                            const members = students.filter(s => studentAssignments[s.nre] === group);
                            const borderColor = GROUP_COLORS[index % GROUP_COLORS.length];
                            return (
                                <div key={group} className="p-4 rounded-lg" style={{ backgroundColor: `${borderColor}40`, borderLeft: `5px solid ${borderColor}` }}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold">{group} ({members.length} miembros)</h4>
                                        <button onClick={() => handleDeleteGroup(group)} className="text-gray-500 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
                                    </div>
                                    {members.length > 0 ? (
                                        <ul className="text-sm space-y-1">
                                            {members.map(m => <li key={m.nre}>- {m.apellido1}, {m.nombre}</li>)}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No hay alumnos en este grupo.</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- SUB-COMPONENT: Configuración ---
const ConfiguracionView: React.FC<{
    leaderRoles: Role[];
    setLeaderRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    secondaryRoles: Role[];
    setSecondaryRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    roleColors: { leader: string, secondary: string };
    setRoleColors: React.Dispatch<React.SetStateAction<{ leader: string, secondary: string }>>;
}> = ({ leaderRoles, setLeaderRoles, secondaryRoles, setSecondaryRoles, roleColors, setRoleColors }) => {
    
    const handleAddRole = (type: 'leader' | 'secondary') => {
        const name = prompt(`Nombre del nuevo rol ${type === 'leader' ? 'de líder' : 'secundario'}:`);
        if (name) {
            const newRole = { name, type };
            if (type === 'leader') {
                setLeaderRoles(prev => [...prev, newRole]);
            } else {
                setSecondaryRoles(prev => [...prev, newRole]);
            }
        }
    };

    const handleDeleteRole = (name: string, type: 'leader' | 'secondary') => {
        if (window.confirm(`¿Seguro que quieres eliminar el rol "${name}"?`)) {
            if (type === 'leader') {
                setLeaderRoles(prev => prev.filter(r => r.name !== name));
            } else {
                setSecondaryRoles(prev => prev.filter(r => r.name !== name));
            }
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg">Líderes del Servicio</h3>
                    <button onClick={() => handleAddRole('leader')} className="text-sm bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-md hover:bg-blue-200">Añadir</button>
                </div>
                <div className="space-y-2">
                    {leaderRoles.map(role => (
                        <div key={role.name} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                            <span>{role.name}</span>
                            <button onClick={() => handleDeleteRole(role.name, 'leader')} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
             <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg">Roles Secundarios</h3>
                    <button onClick={() => handleAddRole('secondary')} className="text-sm bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-md hover:bg-blue-200">Añadir</button>
                </div>
                <div className="space-y-2">
                     {secondaryRoles.map(role => (
                        <div key={role.name} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                            <span>{role.name}</span>
                            <button onClick={() => handleDeleteRole(role.name, 'secondary')} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="md:col-span-2 pt-4 border-t">
                 <h3 className="font-bold text-lg mb-3">Colores para Planning</h3>
                 <div className="flex gap-8 items-center">
                    <div>
                        <label htmlFor="leaderColor" className="font-semibold block mb-1">Color Roles de Líder</label>
                        <input id="leaderColor" type="color" value={roleColors.leader} onChange={e => setRoleColors(prev => ({...prev, leader: e.target.value}))} className="w-24 h-10 p-1 border rounded" />
                    </div>
                     <div>
                        <label htmlFor="secondaryColor" className="font-semibold block mb-1">Color Roles Secundarios</label>
                        <input id="secondaryColor" type="color" value={roleColors.secondary} onChange={e => setRoleColors(prev => ({...prev, secondary: e.target.value}))} className="w-24 h-10 p-1 border rounded" />
                    </div>
                 </div>
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
    
    const handleDeleteService = (service: Service) => {
        if (service.finalized) {
            alert("No se puede eliminar un servicio finalizado.");
            return;
        }
        if (window.confirm("¿Seguro que quieres eliminar este servicio? Se borrarán también todas las asignaciones de roles asociadas.")) {
            setServices(prev => prev.filter(s => s.id !== service.id));
        }
    };

    const handleToggleFinalized = (serviceId: string) => {
        setServices(prev => prev.map(s => s.id === serviceId ? {...s, finalized: !s.finalized} : s));
    }
    
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
                    <div key={s.id} className={`p-4 rounded-lg shadow-md border ${s.finalized ? 'bg-gray-100' : 'bg-white'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">{s.name} {s.finalized && <LockClosedIcon className="h-5 w-5 text-gray-500" />}</h3>
                                <p className="text-sm text-gray-500">{new Date(s.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button onClick={() => handleToggleFinalized(s.id)} className={`text-sm font-semibold px-2 py-1 rounded ${s.finalized ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}>
                                    {s.finalized ? 'Reabrir' : 'Finalizar'}
                                </button>
                                <div>
                                    <button onClick={() => handleOpenModal(s)} disabled={s.finalized} className="text-blue-600 mr-2 disabled:text-gray-400 disabled:cursor-not-allowed">Editar</button>
                                    <button onClick={() => handleDeleteService(s)} disabled={s.finalized} className="text-red-600 disabled:text-gray-400 disabled:cursor-not-allowed">Borrar</button>
                                </div>
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
        groupAssignments: service?.groupAssignments || { comedor: [], takeaway: [] },
        finalized: service?.finalized || false
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
    leaderRoles: Role[];
    secondaryRoles: Role[];
    roleColors: { leader: string, secondary: string };
}> = ({ students, services, assignments, onRoleChange, groupBy = 'none', studentGroupAssignments = {}, leaderRoles, secondaryRoles, roleColors }) => {
    
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
                                {service.finalized && <LockClosedIcon className="h-4 w-4 inline-block mr-1 text-gray-400" />}
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
                                        const isLeader = leaderRoles.some(r => r.name === currentRole);
                                        const isSecondary = secondaryRoles.some(r => r.name === currentRole);
                                        const roleColor = isLeader ? roleColors.leader : (isSecondary ? roleColors.secondary : '');

                                        return (
                                            <td key={service.id} className="px-2 py-1 border-b border-r">
                                                <select
                                                    value={currentRole}
                                                    onChange={e => onRoleChange(service.id, student.nre, e.target.value)}
                                                    disabled={service.finalized}
                                                    className="w-full p-1.5 border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                                                    style={{ backgroundColor: service.finalized ? '' : roleColor }}
                                                >
                                                    <option value="Sin asignar">Sin asignar</option>
                                                    <optgroup label="Líderes del Servicio">
                                                        {leaderRoles.map(role => <option key={role.name} value={role.name}>{role.name}</option>)}
                                                    </optgroup>
                                                    <optgroup label="Roles Secundarios">
                                                        {secondaryRoles.map(role => <option key={role.name} value={role.name}>{role.name}</option>)}
                                                    </optgroup>
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
    const [activeSubView, setActiveSubView] = useState<SubView>('grupos');
    
    // States for each module
    const [practicaGroups, setPracticaGroups] = useState<string[]>(() => safeJsonParse('practicaGroups', ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4']));
    const [studentGroupAssignments, setStudentGroupAssignments] = useState<StudentGroupAssignments>(() => safeJsonParse('studentGroupAssignments', {}));
    const [services, setServices] = useState<Service[]>(() => safeJsonParse('practicaServices', []));
    const [planningAssignments, setPlanningAssignments] = useState<PlanningAssignments>(() => safeJsonParse('planningAssignments', {}));
    const [leaderRoles, setLeaderRoles] = useState<Role[]>(() => safeJsonParse('practicaLeaderRoles', [{ name: "Jefe de Cocina", type: 'leader' }, { name: "2º Jefe de Cocina", type: 'leader' }, { name: "2º Jefe de Takeaway", type: 'leader' }]));
    const [secondaryRoles, setSecondaryRoles] = useState<Role[]>(() => safeJsonParse('practicaSecondaryRoles', [{ name: "Jefe de Partida", type: 'secondary' }, { name: "Cocinero", type: 'secondary' }, { name: "Ayudante", type: 'secondary' }, { name: "Sin servicio 1", type: 'secondary' }, { name: "Sin servicio 2", type: 'secondary' }]));
    const [roleColors, setRoleColors] = useState<{ leader: string, secondary: string }>(() => safeJsonParse('practicaRoleColors', { leader: '#e0f2f1', secondary: '#fffbeb' }));
    
    const [selectedServiceForPdf, setSelectedServiceForPdf] = useState<string>('');

    // Automatic saving effects
    useEffect(() => { localStorage.setItem('practicaGroups', JSON.stringify(practicaGroups)); }, [practicaGroups]);
    useEffect(() => { localStorage.setItem('studentGroupAssignments', JSON.stringify(studentGroupAssignments)); }, [studentGroupAssignments]);
    useEffect(() => { localStorage.setItem('practicaServices', JSON.stringify(services)); }, [services]);
    useEffect(() => { localStorage.setItem('planningAssignments', JSON.stringify(planningAssignments)); }, [planningAssignments]);
    useEffect(() => { localStorage.setItem('practicaLeaderRoles', JSON.stringify(leaderRoles)); }, [leaderRoles]);
    useEffect(() => { localStorage.setItem('practicaSecondaryRoles', JSON.stringify(secondaryRoles)); }, [secondaryRoles]);
    useEffect(() => { localStorage.setItem('practicaRoleColors', JSON.stringify(roleColors)); }, [roleColors]);
    
    useEffect(() => {
        if (!selectedServiceForPdf && services.length > 0) {
            setSelectedServiceForPdf(services[0].id);
        }
    }, [services, selectedServiceForPdf]);


    const handleRoleChange = (serviceId: string, studentNre: string, newRole: string) => {
      setPlanningAssignments(prev => {
          const newAssignments = JSON.parse(JSON.stringify(prev)); // Deep copy
          const serviceAssignments = newAssignments[serviceId] || {};
          
          if (leaderRoles.some(r => r.name === newRole)) {
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

    const handleDownloadClick = () => {
        const service = services.find(s => s.id === selectedServiceForPdf);
        if (service) {
            downloadPlanningPdf(service, students, planningAssignments, studentGroupAssignments, leaderRoles);
        } else {
            alert("Por favor, selecciona un servicio válido para descargar.");
        }
    };

    const renderContent = () => {
        const planningViews = ['planning', 'vision'];
        const content = (() => {
            switch (activeSubView) {
                case 'grupos':
                    return <DistribucionGruposView students={sortedStudents} practicaGroups={practicaGroups} setPracticaGroups={setPracticaGroups} studentAssignments={studentGroupAssignments} setStudentAssignments={setStudentGroupAssignments} />;
                case 'servicios':
                    return <ServiciosView services={services} setServices={setServices} practicaGroups={practicaGroups} />;
                case 'planning':
                case 'vision':
                     return <PlanningGrid students={sortedStudents} services={sortedServices} assignments={planningAssignments} onRoleChange={handleRoleChange} leaderRoles={leaderRoles} secondaryRoles={secondaryRoles} roleColors={roleColors} groupBy={activeSubView === 'vision' ? 'group' : 'none'} studentGroupAssignments={studentGroupAssignments} />;
                case 'configuracion':
                    return <ConfiguracionView leaderRoles={leaderRoles} setLeaderRoles={setLeaderRoles} secondaryRoles={secondaryRoles} setSecondaryRoles={setSecondaryRoles} roleColors={roleColors} setRoleColors={setRoleColors} />;
                default:
                    return null;
            }
        })();
        
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                 {planningViews.includes(activeSubView) && (
                    <div className="flex justify-end items-center gap-4 mb-4 pb-4 border-b">
                         <select value={selectedServiceForPdf} onChange={e => setSelectedServiceForPdf(e.target.value)} className="p-2 border rounded-md bg-white">
                            <option value="" disabled>Selecciona un servicio</option>
                            {sortedServices.map(s => <option key={s.id} value={s.id}>{s.name} - {new Date(s.date).toLocaleDateString()}</option>)}
                        </select>
                        <button onClick={handleDownloadClick} disabled={!selectedServiceForPdf} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center disabled:bg-gray-400">
                            <DownloadIcon className="h-5 w-5 mr-2" /> Descargar Planning
                        </button>
                    </div>
                )}
                {content}
            </div>
        );
    };

    const tabs: { id: SubView, name: string, icon: React.ReactNode }[] = [
        { id: 'grupos', name: 'Distribución de Grupos', icon: <GroupIcon className="h-5 w-5 mr-2" /> },
        { id: 'servicios', name: 'Servicios', icon: <ServiceIcon className="h-5 w-5 mr-2" /> },
        { id: 'planning', name: 'Planning', icon: <CalendarIcon className="h-5 w-5 mr-2" /> },
        { id: 'vision', name: 'Visión Total', icon: <ViewGridIcon className="h-5 w-5 mr-2" /> },
        { id: 'configuracion', name: 'Configuración', icon: <CogIcon className="h-5 w-5 mr-2" /> },
    ];

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión Práctica</h1>
                <p className="mt-2 text-gray-600">Organiza los grupos, define los servicios y asigna roles a los alumnos.</p>
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

            {renderContent()}
        </div>
    );
};

export default GestionPracticaView;
