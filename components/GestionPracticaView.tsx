import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Student, ServiceMenu, ServiceDish } from '../types';
import { UsersIcon, GroupIcon, ServiceIcon, CalendarIcon, TrashIcon, CloseIcon, CogIcon, PlusIcon, PencilIcon, CheckIcon, XIcon, DownloadIcon } from './icons';
import { downloadPdfWithTables, exportToExcel } from './printUtils';


// --- HELPER FUNCTION ---
const safeJsonParse = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        // Ensure item is not null, undefined, or an empty string which causes JSON.parse to fail
        if (item) {
            return JSON.parse(item);
        }
        return defaultValue;
    } catch (error) {
        console.error(`Error parsing JSON from localStorage key "${key}":`, error);
        localStorage.removeItem(key); // Clear corrupted data
        return defaultValue;
    }
};

const uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});


// --- DATA TYPES ---
interface Service {
  id: string;
  name: string;
  date: string;
  trimestre: number;
  groupAssignments: {
    comedor: string[];
    takeaway: string[];
  };
}
type StudentGroupAssignments = Record<string, string>; // { [studentNre]: groupName }
type PlanningAssignments = Record<string, Record<string, string>>; // { [serviceId]: { [studentNre]: role } }

// --- CONSTANTS ---
const LEADER_ROLES = ["Jefe de Cocina", "2º Jefe de Cocina", "2º Jefe de Takeaway"];
const SECONDARY_ROLES = ["Jefe de Partida", "Cocinero", "Ayudante", "Sin servicio 1", "Sin servicio 2"];
const COLOR_PALETTE = ['teal', 'blue', 'green', 'yellow', 'purple', 'pink', 'indigo'];
const colorStyles: Record<string, { border: string; bg: string }> = {
  teal: { border: 'border-teal-500', bg: 'bg-teal-50' },
  blue: { border: 'border-blue-500', bg: 'bg-blue-50' },
  green: { border: 'border-green-500', bg: 'bg-green-50' },
  yellow: { border: 'border-yellow-500', bg: 'bg-yellow-50' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-50' },
  pink: { border: 'border-pink-500', bg: 'bg-pink-50' },
  indigo: { border: 'border-indigo-500', bg: 'bg-indigo-50' },
  default: { border: 'border-gray-200', bg: 'bg-gray-50' },
};


// --- MOCK API for AI assignments ---
const mockGeminiApiCall = (prompt: string): Promise<Record<string, string>> => {
    console.log("--- Sending prompt to Mock Gemini API ---");
    console.log(prompt);
    
    const studentsMatch = prompt.match(/Students to assign: (\[.*?\])/);
    const rolesMatch = prompt.match(/Available secondary roles to fill: (\[.*?\])/);
    
    if (!studentsMatch || !rolesMatch) {
      return Promise.reject("Invalid prompt format for mock API");
    }

    const studentsToAssign: {nre: string}[] = JSON.parse(studentsMatch[1]);
    const availableRoles: string[] = JSON.parse(rolesMatch[1]);

    const assignments: Record<string, string> = {};
    let studentPool = [...studentsToAssign].sort(() => Math.random() - 0.5);
    let rolePool = [...availableRoles].sort(() => Math.random() - 0.5);

    // Assign one unique role to each student until roles or students run out.
    while(studentPool.length > 0 && rolePool.length > 0) {
        const student = studentPool.pop();
        const role = rolePool.shift();
        if(student && role) {
            assignments[student.nre] = role;
        }
    }
    // Any remaining students are left unassigned, as per the corrected logic.
    // The previous logic incorrectly assigned "Ayudante" to all remaining students,
    // violating the unique role constraint within a group.

    console.log("--- Mock Gemini API Response ---", assignments);

    return new Promise(resolve => setTimeout(() => resolve(assignments), 500));
};


// --- TAB COMPONENTS ---

const ConfiguracionTab: React.FC<{
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  handleDeleteService: (id: string) => void;
}> = ({ services, setServices, handleDeleteService }) => {
    const [addingToTrimester, setAddingToTrimester] = useState<number | null>(null);
    const [manualService, setManualService] = useState({ name: '', date: ''});
    const [editingService, setEditingService] = useState<Service | null>(null);

    const calculateDefaultDate = (trimestre: number, allServices: Service[]): string => {
        const servicesInTrimester = allServices
            .filter(s => s.trimestre === trimestre)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (servicesInTrimester.length > 0) {
            const lastDate = new Date(servicesInTrimester[0].date);
            lastDate.setDate(lastDate.getDate() + 7);
            return lastDate.toISOString().split('T')[0];
        }

        const now = new Date();
        const year = now.getFullYear();
        const academicYearStartMonth = 8; // September (0-indexed)
        let academicYear = now.getMonth() >= academicYearStartMonth ? year : year - 1;

        switch (trimestre) {
            case 1: return new Date(academicYear, 8, 15).toISOString().split('T')[0]; // Sep 15
            case 2: return new Date(academicYear + 1, 0, 15).toISOString().split('T')[0]; // Jan 15
            case 3: return new Date(academicYear + 1, 3, 15).toISOString().split('T')[0]; // Apr 15
            default: return now.toISOString().split('T')[0];
        }
    };

    const handleShowAddForm = (trimestre: number) => {
        const defaultDate = calculateDefaultDate(trimestre, services);
        const serviceCount = services.filter(s => s.trimestre === trimestre).length;
        setManualService({ name: `Servicio T${trimestre} #${serviceCount + 1}`, date: defaultDate });
        setAddingToTrimester(trimestre);
    };

    const handleAddManualService = () => {
        if (!manualService.name || !manualService.date || addingToTrimester === null) {
            alert("Por favor, complete el nombre y la fecha.");
            return;
        }
        const newService: Service = {
            id: `service_${Date.now()}`,
            name: manualService.name,
            date: manualService.date,
            trimestre: addingToTrimester,
            groupAssignments: { comedor: [], takeaway: [] }
        };
        setServices(prev => [...prev, newService].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setAddingToTrimester(null);
        setManualService({ name: '', date: '' });
    };

    const handleUpdateService = () => {
        if (editingService) {
            setServices(prev => prev.map(s => s.id === editingService.id ? editingService : s));
            setEditingService(null);
        }
    };

    const servicesByTrimester = useMemo(() => {
        const grouped: { [key: number]: Service[] } = { 1: [], 2: [], 3: [] };
        services.forEach(service => {
            const trimestre = service.trimestre || 1;
            if (!grouped[trimestre]) grouped[trimestre] = [];
            grouped[trimestre].push(service);
        });
        Object.keys(grouped).forEach(key => {
            const numKey = parseInt(key, 10);
            grouped[numKey].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        });
        return grouped;
    }, [services]);

    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Servicios del Curso ({services.length})</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(trimestre => (
                    <div key={trimestre} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col">
                        <h4 className="font-bold text-lg text-gray-700 mb-3 text-center border-b pb-2">Trimestre {trimestre}</h4>
                        
                        <div className="space-y-2 mb-4 flex-1 min-h-[200px] max-h-80 overflow-y-auto pr-2">
                            {servicesByTrimester[trimestre] && servicesByTrimester[trimestre].length > 0 ? (
                                servicesByTrimester[trimestre].map(service => (
                                    <div key={service.id} className="bg-white p-2 rounded-md shadow-sm text-sm">
                                        {editingService?.id === service.id ? (
                                            <div className="space-y-2">
                                                <input type="text" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} className="p-1 border rounded w-full text-sm" />
                                                <input type="date" value={editingService.date} onChange={e => setEditingService({...editingService, date: e.target.value})} className="p-1 border rounded w-full text-sm" />
                                                <div className="flex justify-end space-x-2">
                                                    <button onClick={handleUpdateService} className="text-green-600 hover:text-green-800"><CheckIcon className="h-5 w-5"/></button>
                                                    <button onClick={() => setEditingService(null)} className="text-red-600 hover:text-red-800"><XIcon className="h-5 w-5"/></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{service.name}</p>
                                                    <p className="text-xs text-gray-500">{new Date(service.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex items-center space-x-2 flex-shrink-0">
                                                    <button onClick={() => setEditingService({...service})} className="text-blue-500 hover:text-blue-700"><PencilIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => handleDeleteService(service.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic text-center pt-8">No hay servicios.</p>
                            )}
                        </div>
                        
                        {addingToTrimester === trimestre && (
                             <div className="bg-teal-50 p-3 rounded-md mb-4 border border-dashed border-teal-300 space-y-3">
                                <h5 className="font-semibold text-sm text-teal-800">Nuevo Servicio</h5>
                                <input type="text" placeholder="Nombre del Servicio" value={manualService.name} onChange={e => setManualService({...manualService, name: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                <input type="date" value={manualService.date} onChange={e => setManualService({...manualService, date: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                <div className="text-right space-x-2">
                                    <button onClick={() => setAddingToTrimester(null)} className="px-3 py-1 bg-gray-200 rounded text-xs">Cancelar</button>
                                    <button onClick={handleAddManualService} className="px-3 py-1 bg-teal-500 text-white rounded text-xs">Guardar</button>
                                </div>
                            </div>
                        )}

                        <button onClick={() => handleShowAddForm(trimestre)} className="w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm px-3 py-1.5 rounded-md mt-auto">
                           <PlusIcon className="h-4 w-4 mr-1"/> Añadir Servicio
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
};

const ServiciosTab: React.FC<{
    services: Service[];
    setServices: React.Dispatch<React.SetStateAction<Service[]>>;
    practicaGroups: string[];
    planningAssignments: PlanningAssignments;
    students: Student[];
    onOpenFicha: (service: Service) => void;
}> = ({ services, setServices, practicaGroups, planningAssignments, students, onOpenFicha }) => {

    const handleGroupAssignmentChange = (serviceId: string, type: 'comedor' | 'takeaway', group: string, checked: boolean) => {
        setServices(prevServices => prevServices.map(s => {
            if (s.id === serviceId) {
                const currentAssignments = s.groupAssignments[type];
                const newAssignments = checked 
                    ? [...currentAssignments, group] 
                    : currentAssignments.filter(g => g !== group);
                return { ...s, groupAssignments: { ...s.groupAssignments, [type]: newAssignments }};
            }
            return s;
        }));
    };
    
    return (
        <div className="space-y-4">
             {services.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(service => {
                const leaderAssignments = planningAssignments[service.id] || {};
                const leaders = students.filter(s => LEADER_ROLES.includes(leaderAssignments[s.nre]));

                return (
                    <details key={service.id} className="bg-white p-4 rounded-lg shadow-md open:ring-2 open:ring-teal-500">
                        <summary className="font-bold text-lg cursor-pointer flex justify-between">
                           {service.name} <span className="font-normal text-gray-600">{new Date(service.date).toLocaleDateString()}</span>
                        </summary>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                            <div>
                                <h4 className="font-semibold mb-2">Asignar Grupos (Comedor)</h4>
                                <div className="space-y-1">
                                {practicaGroups.map(g => (
                                    <label key={g} className="flex items-center">
                                        <input type="checkbox" checked={service.groupAssignments.comedor.includes(g)} onChange={(e) => handleGroupAssignmentChange(service.id, 'comedor', g, e.target.checked)} className="h-4 w-4 text-teal-600 border-gray-300 rounded"/>
                                        <span className="ml-2 text-sm">{g}</span>
                                    </label>
                                ))}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">Asignar Grupos (Takeaway)</h4>
                                <div className="space-y-1">
                                {practicaGroups.map(g => (
                                    <label key={g} className="flex items-center">
                                        <input type="checkbox" checked={service.groupAssignments.takeaway.includes(g)} onChange={(e) => handleGroupAssignmentChange(service.id, 'takeaway', g, e.target.checked)} className="h-4 w-4 text-teal-600 border-gray-300 rounded"/>
                                        <span className="ml-2 text-sm">{g}</span>
                                    </label>
                                ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Resumen de Líderes</h4>
                                {leaders.length > 0 ? (
                                     <ul className="text-sm space-y-1">
                                        {leaders.map(l => <li key={l.nre}><strong>{leaderAssignments[l.nre]}:</strong> {l.apellido1}, {l.nombre}</li>)}
                                     </ul>
                                ) : <p className="text-sm text-gray-500">Pendiente de asignación.</p>}
                                 <button className="mt-4 text-sm bg-teal-500 text-white font-bold px-3 py-2 rounded-md hover:bg-teal-600 w-full" onClick={() => onOpenFicha(service)}>
                                    Gestionar Ficha de Servicio
                                </button>
                            </div>
                        </div>
                    </details>
                )
             })}
        </div>
    );
};

const PlanningTab: React.FC<{
    services: Service[];
    students: Student[];
    studentGroupAssignments: StudentGroupAssignments;
    planningAssignments: PlanningAssignments;
    setPlanningAssignments: React.Dispatch<React.SetStateAction<PlanningAssignments>>;
}> = ({ services, students, studentGroupAssignments, planningAssignments, setPlanningAssignments }) => {
    const [isLoading, setIsLoading] = useState<string | null>(null); // serviceId of loading service
    const [openExportMenu, setOpenExportMenu] = useState<string | null>(null);

    const sortedStudentsForDropdown = useMemo(() => {
        return [...students].sort((a, b) => {
            const nameA = `${a.apellido1} ${a.apellido2} ${a.nombre}`.toLowerCase();
            const nameB = `${b.apellido1} ${b.apellido2} ${b.nombre}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [students]);

    const handlePlanningChange = (serviceId: string, studentNre: string, newRole: string, groupName: string | null) => {
        setPlanningAssignments(prev => {
            const serviceAssignments = { ...(prev[serviceId] || {}) };
            
            delete serviceAssignments[studentNre];

            if (LEADER_ROLES.includes(newRole)) {
                const currentHolderNre = Object.keys(serviceAssignments).find(nre => serviceAssignments[nre] === newRole);
                if (currentHolderNre) {
                    delete serviceAssignments[currentHolderNre];
                }
            }
    
            if (newRole !== "Sin asignar") {
                serviceAssignments[studentNre] = newRole;
            }
    
            return { ...prev, [serviceId]: serviceAssignments };
        });
    };

    const handleDeployAI = async (service: Service) => {
        setIsLoading(service.id);
        const serviceGroups = [...new Set([...service.groupAssignments.comedor, ...service.groupAssignments.takeaway])];
        let newServiceAssignments = { ...(planningAssignments[service.id] || {}) };
        let assignmentsMadeCount = 0;

        try {
            for (const groupName of serviceGroups) {
                const studentsInGroup = students.filter(s => studentGroupAssignments[s.nre] === groupName);
                const assignedNREsInGroup = new Set(Object.keys(newServiceAssignments));
                
                const studentsToAssign = studentsInGroup
                    .filter(s => !assignedNREsInGroup.has(s.nre))
                    .map(s => ({ nre: s.nre, nombre: s.nombre, apellido1: s.apellido1 }));

                if (studentsToAssign.length === 0) continue;

                const assignedRolesInGroup = Object.values(newServiceAssignments).filter(role => {
                    const assignees = Object.keys(newServiceAssignments).filter(nre => newServiceAssignments[nre] === role);
                    return studentsInGroup.some(s => assignees.includes(s.nre));
                });
                const availableRoles = SECONDARY_ROLES.filter(r => !assignedRolesInGroup.includes(r));
                
                const prompt = `You are a kitchen manager's assistant. Your task is to assign secondary cooking roles to a list of students within a specific work group ("partida").
                Context for Group "${groupName}":
                - Service Name: ${service.name}
                - Students to assign: ${JSON.stringify(studentsToAssign)}
                - Available secondary roles to fill for this group: ${JSON.stringify(availableRoles)}
                Rules:
                1. Assign ONE unique role from the available list to each student.
                2. Do not repeat roles within this group.
                3. If there are more students than roles, leave some students unassigned.
                Output the result as a single, valid JSON object where keys are student NREs (as strings) and values are the assigned role (as a string).
                `;

                const aiGroupAssignments = await mockGeminiApiCall(prompt);
                Object.keys(aiGroupAssignments).forEach(nre => {
                    if(!newServiceAssignments[nre]){ // Double check not to overwrite
                        newServiceAssignments[nre] = aiGroupAssignments[nre];
                        assignmentsMadeCount++;
                    }
                });
            }

            setPlanningAssignments(prev => ({
                ...prev,
                [service.id]: newServiceAssignments
            }));
            
            alert(`Despliegue de IA completado. Se han realizado ${assignmentsMadeCount} nuevas asignaciones.`);

        } catch (error) {
            console.error("AI Assignment failed:", error);
            alert("Error al desplegar con IA.");
        } finally {
            setIsLoading(null);
        }
    };

    const handleDownloadPdfPlanning = (service: Service) => {
        const serviceAssignments = planningAssignments[service.id] || {};
        const tables = [];
        const commonColumnStyles = { 0: { cellWidth: 'auto' }, 1: { cellWidth: 60 } };

        // Leaders Table
        const leadersBody = LEADER_ROLES.map(role => {
            const studentNre = Object.keys(serviceAssignments).find(nre => serviceAssignments[nre] === role);
            const student = students.find(s => s.nre === studentNre);
            return [role, student ? `${student.apellido1} ${student.apellido2}, ${student.nombre}` : 'Sin asignar'];
        });
        tables.push({
            head: [['Líderes del Servicio']],
            body: leadersBody,
            columnStyles: commonColumnStyles,
            options: { headStyles: { fillColor: '#d1fae5', textColor: '#065f46', fontStyle: 'bold' } }
        });

        // Comedor Section
        if (service.groupAssignments.comedor.length > 0) {
            tables.push({ head: [['SERVICIO DE COMEDOR']], body: [], options: { headStyles: { fillColor: '#22c55e', textColor: 'white', fontStyle: 'bold', fontSize: 14 } } });
            service.groupAssignments.comedor.forEach(groupName => {
                const studentsInGroup = students.filter(s => studentGroupAssignments[s.nre] === groupName)
                    .sort((a,b) => `${a.apellido1} ${a.apellido2}`.localeCompare(`${b.apellido1} ${b.apellido2}`));
                const body = studentsInGroup.map(student => {
                    const role = serviceAssignments[student.nre] || 'Sin asignar';
                    return [`${student.apellido1} ${student.apellido2}, ${student.nombre}`, role];
                });
                tables.push({
                    head: [[groupName, 'Rol']],
                    body: body,
                    columnStyles: commonColumnStyles,
                    options: { headStyles: { fillColor: '#f0fdf4', textColor: '#15803d' } }
                });
            });
        }
        
        // Takeaway Section
        if (service.groupAssignments.takeaway.length > 0) {
            tables.push({ head: [['SERVICIO DE TAKEAWAY']], body: [], options: { headStyles: { fillColor: '#3b82f6', textColor: 'white', fontStyle: 'bold', fontSize: 14 } } });
             service.groupAssignments.takeaway.forEach(groupName => {
                const studentsInGroup = students.filter(s => studentGroupAssignments[s.nre] === groupName)
                    .sort((a,b) => `${a.apellido1} ${a.apellido2}`.localeCompare(`${b.apellido1} ${b.apellido2}`));
                const body = studentsInGroup.map(student => {
                    const role = serviceAssignments[student.nre] || 'Sin asignar';
                    return [`${student.apellido1} ${student.apellido2}, ${student.nombre}`, role];
                });
                tables.push({
                    head: [[groupName, 'Rol']],
                    body: body,
                    columnStyles: commonColumnStyles,
                    options: { headStyles: { fillColor: '#dbeafe', textColor: '#1e40af' } }
                });
            });
        }

        downloadPdfWithTables(
            `Planning: ${service.name} (${new Date(service.date).toLocaleDateString()})`,
            `planning_${service.name.replace(/\s+/g, '_')}`,
            tables,
            { orientation: 'landscape' }
        );
        setOpenExportMenu(null);
    };

    const handleExportExcelPlanning = (service: Service) => {
        const serviceAssignments = planningAssignments[service.id] || {};
        const dataToExport: any[] = [];

        LEADER_ROLES.forEach(role => {
            const studentNre = Object.keys(serviceAssignments).find(nre => serviceAssignments[nre] === role);
            const student = students.find(s => s.nre === studentNre);
            dataToExport.push({
                'Partida': 'Liderazgo',
                'Rol': role,
                'Alumno': student ? `${student.apellido1} ${student.apellido2}, ${student.nombre}` : 'Sin asignar'
            });
        });

        const serviceGroups = [...new Set([...service.groupAssignments.comedor, ...service.groupAssignments.takeaway])];
        serviceGroups.forEach(groupName => {
            const studentsInGroup = students.filter(s => studentGroupAssignments[s.nre] === groupName);
            studentsInGroup.forEach(student => {
                 dataToExport.push({
                    'Partida': groupName,
                    'Rol': serviceAssignments[student.nre] || 'Sin asignar',
                    'Alumno': `${student.apellido1} ${student.apellido2}, ${student.nombre}`
                });
            });
        });

        exportToExcel(dataToExport, `planning_${service.name.replace(/\s+/g, '_')}`, 'Planning');
        setOpenExportMenu(null);
    };

    const sortedServices = useMemo(() => services.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [services]);

    return (
        <div className="space-y-6">
            {sortedServices.map(service => {
                const serviceAssignments = planningAssignments[service.id] || {};
                const serviceGroups = [...new Set([...service.groupAssignments.comedor, ...service.groupAssignments.takeaway])];

                return (
                    <div key={service.id} className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{service.name}</h3>
                                <p className="text-sm text-gray-500">{new Date(service.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button 
                                        onClick={() => setOpenExportMenu(prev => prev === service.id ? null : service.id)}
                                        className="bg-green-500 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-green-600 text-sm flex items-center"
                                    >
                                        <DownloadIcon className="h-4 w-4 mr-1"/> Exportar
                                    </button>
                                    {openExportMenu === service.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                            <button onClick={() => handleDownloadPdfPlanning(service)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Descargar PDF</button>
                                            <button onClick={() => handleExportExcelPlanning(service)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Exportar a Excel</button>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleDeployAI(service)}
                                    disabled={isLoading === service.id}
                                    className="bg-indigo-500 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-600 disabled:bg-gray-400 text-sm">
                                    {isLoading === service.id ? "Procesando..." : "Guardar y Desplegar IA"}
                                </button>
                            </div>
                        </div>

                        {/* Leader Assignments */}
                        <div className="bg-gray-50 p-3 rounded-md mb-4">
                            <h4 className="font-semibold text-gray-700 mb-2">Roles de Liderazgo (Servicio Completo)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {LEADER_ROLES.map(role => {
                                    const assignedStudentNre = Object.keys(serviceAssignments).find(nre => serviceAssignments[nre] === role);
                                    return (
                                        <div key={role}>
                                            <label className="text-xs font-medium text-gray-600">{role}</label>
                                            <select value={assignedStudentNre || "Sin asignar"} onChange={e => handlePlanningChange(service.id, e.target.value, role, null)} className="w-full text-sm p-1.5 border rounded-md bg-white">
                                                <option value="Sin asignar">Sin asignar</option>
                                                {sortedStudentsForDropdown.map(s => <option key={s.nre} value={s.nre}>{s.apellido1} {s.apellido2}, {s.nombre}</option>)}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Group/Partida Assignments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {serviceGroups.map(groupName => {
                                const studentsInGroup = students
                                    .filter(s => studentGroupAssignments[s.nre] === groupName)
                                    .sort((a,b) => `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`));
                                
                                const rolesAssignedInGroup = Object.values(serviceAssignments).filter(role => {
                                  const assigneeNre = Object.keys(serviceAssignments).find(nre => serviceAssignments[nre] === role);
                                  return studentsInGroup.some(s => s.nre === assigneeNre);
                                });

                                return (
                                    <div key={groupName} className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                                        <h5 className="font-bold text-blue-800 mb-2">{groupName}</h5>
                                        <div className="space-y-2">
                                            {studentsInGroup.map(student => {
                                                const currentRole = serviceAssignments[student.nre] || "Sin asignar";
                                                const availableRoles = SECONDARY_ROLES.filter(r => !rolesAssignedInGroup.includes(r));
                                                return (
                                                    <div key={student.nre} className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-gray-700 w-2/5 truncate">{student.apellido1} {student.apellido2}, {student.nombre}</span>
                                                        <select
                                                            value={currentRole}
                                                            onChange={e => handlePlanningChange(service.id, student.nre, e.target.value, groupName)}
                                                            className="w-3/5 text-sm p-1 border rounded-md"
                                                            disabled={LEADER_ROLES.includes(currentRole)}
                                                        >
                                                            <option value="Sin asignar">Sin asignar</option>
                                                            {currentRole !== "Sin asignar" && !availableRoles.includes(currentRole) && <option value={currentRole}>{currentRole}</option>}
                                                            {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                         {serviceGroups.length === 0 && <p className="text-center text-gray-500 italic py-4">No hay grupos asignados a este servicio.</p>}
                    </div>
                )
            })}
        </div>
    );
};


const PartidasYGruposTab: React.FC<{
  students: Student[];
  practicaGroups: string[];
  setPracticaGroups: React.Dispatch<React.SetStateAction<string[]>>;
  studentGroupAssignments: StudentGroupAssignments;
  setStudentGroupAssignments: React.Dispatch<React.SetStateAction<StudentGroupAssignments>>;
  groupColors: Record<string, string>;
  setGroupColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleDeleteGroup: (groupName: string) => void;
}> = ({ students, practicaGroups, setPracticaGroups, studentGroupAssignments, setStudentGroupAssignments, groupColors, setGroupColors, handleDeleteGroup }) => {
  const [filter, setFilter] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleAssignmentChange = (studentNre: string, group: string) => {
    setStudentGroupAssignments(prev => ({ ...prev, [studentNre]: group }));
  };

  const handleRemoveFromGroup = (studentNre: string) => {
    const student = students.find(s => s.nre === studentNre);
    const studentName = student ? `${student.nombre} ${student.apellido1}` : 'este alumno';
    if (window.confirm(`¿Estás seguro de que quieres quitar a ${studentName} de su grupo actual?`)) {
        setStudentGroupAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[studentNre];
            return newAssignments;
        });
    }
  };


  const handleAddNewGroup = () => {
    const newGroupName = `Grupo ${practicaGroups.length + 1}`;
    const newColor = COLOR_PALETTE[practicaGroups.length % COLOR_PALETTE.length];
    setPracticaGroups(prev => [...prev, newGroupName]);
    setGroupColors(prev => ({ ...prev, [newGroupName]: newColor }));
  };

  const handleDownloadPdfGroups = () => {
    const tables = practicaGroups.map(group => {
        const members = students.filter(s => studentGroupAssignments[s.nre] === group)
            .sort((a,b) => `${a.apellido1} ${a.apellido2}`.localeCompare(`${b.apellido1} ${b.apellido2}`));
        
        const head = [[`#`, `Nombre Completo`]];
        const body = members.map((m, i) => [String(i + 1), `${m.apellido1} ${m.apellido2}, ${m.nombre}`]);
        const columnStyles = { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }};

        return {
            head: [[{ content: `${group} (${members.length} miembros)`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }]],
            body: [
                ...head, // Sub-header
                ...body
            ],
            columnStyles,
            options: {
                theme: 'grid'
            }
        };
    });

    downloadPdfWithTables('Distribución de Grupos de Prácticas', 'distribucion_grupos', tables);
    setIsExportMenuOpen(false);
  };
  
  const handleExportExcelGroups = () => {
    const dataToExport: any[] = [];
    practicaGroups.forEach(group => {
        const members = students.filter(s => studentGroupAssignments[s.nre] === group).sort((a,b) => `${a.apellido1} ${a.apellido2}`.localeCompare(`${b.apellido1} ${b.apellido2}`));
        if (members.length > 0) {
            members.forEach(m => {
                dataToExport.push({
                    'Grupo': group,
                    'Apellidos': `${m.apellido1} ${m.apellido2}`,
                    'Nombre': m.nombre,
                    'NRE': m.nre
                });
            });
        } else {
             dataToExport.push({ 'Grupo': group, 'Apellidos': 'Sin alumnos', 'Nombre': '', 'NRE': '' });
        }
    });
    exportToExcel(dataToExport, 'distribucion_grupos', 'Grupos');
    setIsExportMenuOpen(false);
  };

  const filteredStudents = useMemo(() => students.filter(student =>
        `${student.nombre} ${student.apellido1} ${student.apellido2}`.toLowerCase().includes(filter.toLowerCase())
    ).sort((a, b) => {
        const nameA = `${a.apellido1} ${a.apellido2} ${a.nombre}`.toLowerCase();
        const nameB = `${b.apellido1} ${b.apellido2} ${b.nombre}`.toLowerCase();
        return nameA.localeCompare(nameB);
    }), 
  [students, filter]);

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-gray-800">Distribución de Grupos y Alumnos</h4>
            <div className="relative">
                <button 
                    onClick={() => setIsExportMenuOpen(prev => !prev)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                    <DownloadIcon className="h-5 w-5 mr-1"/>
                    Exportar
                </button>
                {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                        <button onClick={handleDownloadPdfGroups} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Descargar PDF</button>
                        <button onClick={handleExportExcelGroups} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Exportar a Excel</button>
                    </div>
                )}
            </div>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-3/5 lg:pr-8 md:border-r md:border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Alumnos y Participación</h4>
                <input type="text" placeholder="Buscar alumno..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                <div className="bg-white p-2 sm:p-4 rounded-lg shadow-md space-y-4 max-h-[60vh] overflow-y-auto">
                {filteredStudents.map((student, index) => {
                    const studentGroup = studentGroupAssignments[student.nre];
                    const studentColorName = studentGroup ? groupColors[studentGroup] : 'default';
                    const studentColorStyle = colorStyles[studentColorName] || colorStyles.default;

                    return (
                    <div key={student.nre} className={`border-b pb-4 last:border-b-0 border-l-4 p-2 rounded-r-md ${studentColorStyle.border}`}>
                        <div className="flex items-center space-x-4">
                        <span className="font-bold text-gray-500 w-6 text-center">{index + 1}.</span>
                        <img src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.nre}`} alt="" className="h-12 w-12 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{student.apellido1} {student.apellido2}, {student.nombre}</p>
                            <p className="text-sm text-gray-500">{student.grupo}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <select value={studentGroupAssignments[student.nre] || ''} onChange={(e) => handleAssignmentChange(student.nre, e.target.value)} className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500">
                            <option value="" disabled>Sin grupo</option>
                            {practicaGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <button onClick={() => handleRemoveFromGroup(student.nre)} title="Quitar de cualquier grupo" className="text-gray-400 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                        </div>
                    </div>
                )})}
                {filteredStudents.length === 0 && (<p className="text-center text-gray-500 py-8">No se encontraron alumnos.</p>)}
                </div>
            </div>
            <div className="w-full md:w-2/5">
                <div className="flex justify-between items-center mb-4 gap-4">
                    <h4 className="text-lg font-semibold text-gray-800">Vista de Grupos</h4>
                    <button onClick={handleAddNewGroup} className="bg-teal-500 text-white font-bold text-sm px-3 py-1.5 rounded-md hover:bg-teal-600">Añadir Grupo</button>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {practicaGroups.map((group) => {
                    const members = students
                        .filter(s => studentGroupAssignments[s.nre] === group)
                        .sort((a,b) => `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`));
                    const colorName = groupColors[group] || 'default';
                    const { border: borderColor, bg: bgColor } = colorStyles[colorName] || colorStyles.default;
                    return (
                    <div key={group} className={`p-4 rounded-lg shadow-md border-l-4 ${borderColor} ${bgColor}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="font-bold text-gray-800">{group} ({members.length} miembros)</h5>
                            <button onClick={() => handleDeleteGroup(group)} title={`Eliminar grupo ${group}`} className="text-gray-400 hover:text-red-600">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-2">
                        {members.length > 0 ? members.map((member, index) => (
                            <div key={member.nre} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm">
                            <div className="flex items-center space-x-2 min-w-0">
                                <span className="text-xs text-gray-500 w-5">{index + 1}.</span>
                                <img src={member.photoUrl || `https://i.pravatar.cc/150?u=${member.nre}`} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{member.apellido1} {member.apellido2}, {member.nombre}</span>
                            </div>
                            <button onClick={() => handleRemoveFromGroup(member.nre)} title="Quitar del grupo" className="text-gray-400 hover:text-red-500 ml-2"><CloseIcon className="h-4 w-4" /></button>
                            </div>
                        )) : <p className="text-sm text-gray-500 italic">No hay alumnos en este grupo.</p>}
                        </div>
                    </div>
                    );
                })}
                </div>
            </div>
        </div>
    </div>
  );
};


// --- MAIN VIEW COMPONENT ---

type PracticaTab = 'Partidas y Grupos' | 'Configuración' | 'Servicios' | 'Planning';

interface GestionPracticaViewProps {
  students: Student[];
}

const GestionPracticaView: React.FC<GestionPracticaViewProps> = ({ students }) => {
  const [activeTab, setActiveTab] = useState<PracticaTab>('Partidas y Grupos');
  
  // State for group management
  const [practicaGroups, setPracticaGroups] = useState<string[]>(() => safeJsonParse('practicaGroups', ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4"]));
  const [studentGroupAssignments, setStudentGroupAssignments] = useState<StudentGroupAssignments>(() => safeJsonParse('studentGroupAssignments', {}));
  const [groupColors, setGroupColors] = useState<Record<string, string>>(() => safeJsonParse('groupColors', {}));

  // State for services and planning
  const [services, setServices] = useState<Service[]>(() => safeJsonParse('practicaServices', []));
  const [planningAssignments, setPlanningAssignments] = useState<PlanningAssignments>(() => safeJsonParse('planningAssignments', {}));
  const [serviceMenus, setServiceMenus] = useState<{[serviceId: string]: ServiceMenu}>(() => safeJsonParse('practicaServiceMenus', {}));

  // State for Ficha de Servicio modal
  const [fichaService, setFichaService] = useState<Service | null>(null);

  // Automatic saving effects
  useEffect(() => { localStorage.setItem('practicaServices', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('planningAssignments', JSON.stringify(planningAssignments)); }, [planningAssignments]);
  useEffect(() => { localStorage.setItem('practicaGroups', JSON.stringify(practicaGroups)); }, [practicaGroups]);
  useEffect(() => { localStorage.setItem('studentGroupAssignments', JSON.stringify(studentGroupAssignments)); }, [studentGroupAssignments]);
  useEffect(() => { localStorage.setItem('groupColors', JSON.stringify(groupColors)); }, [groupColors]);
  useEffect(() => { localStorage.setItem('practicaServiceMenus', JSON.stringify(serviceMenus)); }, [serviceMenus]);

  // Effect to clean up assignments if students are deleted from the main list
  useEffect(() => {
    const studentNreSet = new Set(students.map(s => s.nre));

    setStudentGroupAssignments(prev => {
        const newAssignments = {...prev};
        let changed = false;
        for (const nre in newAssignments) {
            if (!studentNreSet.has(nre)) {
                delete newAssignments[nre];
                changed = true;
            }
        }
        return changed ? newAssignments : prev;
    });

    setPlanningAssignments(prev => {
        const newAssignments = JSON.parse(JSON.stringify(prev));
        let changed = false;
        for (const serviceId in newAssignments) {
            for (const nre in newAssignments[serviceId]) {
                if (!studentNreSet.has(nre)) {
                    delete newAssignments[serviceId][nre];
                    changed = true;
                }
            }
        }
        return changed ? newAssignments : prev;
    });

  }, [students]);

  const handleDeleteService = useCallback((serviceId: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este servicio? Esta acción también borrará todas las asignaciones de roles asociadas.")) {
        setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
        setPlanningAssignments(prevAssignments => {
            const newAssignments = { ...prevAssignments };
            if (newAssignments[serviceId]) {
                delete newAssignments[serviceId];
            }
            return newAssignments;
        });
        setServiceMenus(prevMenus => {
            const newMenus = { ...prevMenus };
            if (newMenus[serviceId]) {
                delete newMenus[serviceId];
            }
            return newMenus;
        });
    }
  }, [setServices, setPlanningAssignments, setServiceMenus]);

  const handleDeleteGroup = useCallback((groupToDelete: string) => {
      if (window.confirm(`¿Estás seguro de que quieres eliminar el grupo "${groupToDelete}"? Los alumnos asignados pasarán a "Sin grupo" y el grupo se eliminará de todos los servicios.`)) {
          
          setStudentGroupAssignments(prev => {
              const newAssignments = { ...prev };
              Object.keys(newAssignments).forEach(nre => {
                  if (newAssignments[nre] === groupToDelete) {
                      delete newAssignments[nre];
                  }
              });
              return newAssignments;
          });

          setServices(prev => 
              prev.map(service => {
                  const newComedor = service.groupAssignments.comedor.filter(g => g !== groupToDelete);
                  const newTakeaway = service.groupAssignments.takeaway.filter(g => g !== groupToDelete);
                  if (newComedor.length < service.groupAssignments.comedor.length || newTakeaway.length < service.groupAssignments.takeaway.length) {
                      return { ...service, groupAssignments: { comedor: newComedor, takeaway: newTakeaway } };
                  }
                  return service;
              })
          );

          setPracticaGroups(prev => prev.filter(g => g !== groupToDelete));
          
          setGroupColors(prev => {
              const newColors = { ...prev };
              delete newColors[groupToDelete];
              return newColors;
          });
      }
  }, [setStudentGroupAssignments, setServices, setPracticaGroups, setGroupColors]);
  
  // Ensure initial colors are set for existing groups
  useEffect(() => {
    let updated = false;
    const newColors = { ...groupColors };
    practicaGroups.forEach((group, index) => {
        if (!newColors[group]) {
            newColors[group] = COLOR_PALETTE[index % COLOR_PALETTE.length];
            updated = true;
        }
    });
    if (updated) {
        setGroupColors(newColors);
    }
  }, [practicaGroups, groupColors]);


  const renderContent = () => {
    switch (activeTab) {
      case 'Partidas y Grupos':
        return <PartidasYGruposTab 
                    students={students} 
                    practicaGroups={practicaGroups} 
                    setPracticaGroups={setPracticaGroups} 
                    studentGroupAssignments={studentGroupAssignments} 
                    setStudentGroupAssignments={setStudentGroupAssignments}
                    groupColors={groupColors}
                    setGroupColors={setGroupColors}
                    handleDeleteGroup={handleDeleteGroup}
                />;
      case 'Configuración':
        return <ConfiguracionTab services={services} setServices={setServices} handleDeleteService={handleDeleteService} />;
      case 'Servicios':
        return <ServiciosTab services={services} setServices={setServices} practicaGroups={practicaGroups} planningAssignments={planningAssignments} students={students} onOpenFicha={setFichaService} />;
      case 'Planning':
        return <PlanningTab services={services} students={students} studentGroupAssignments={studentGroupAssignments} planningAssignments={planningAssignments} setPlanningAssignments={setPlanningAssignments} />;
      default:
        return null;
    }
  };

  const tabs: { name: PracticaTab, icon: React.ReactNode }[] = [
    { name: 'Partidas y Grupos', icon: <GroupIcon className="h-5 w-5 mr-2" /> },
    { name: 'Configuración', icon: <CogIcon className="h-5 w-5 mr-2" /> },
    { name: 'Servicios', icon: <ServiceIcon className="h-5 w-5 mr-2" /> },
    { name: 'Planning', icon: <CalendarIcon className="h-5 w-5 mr-2" /> },
  ];

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión Práctica</h1>
        <p className="mt-2 text-gray-600">Organice y supervise las actividades prácticas del programa de cocina.</p>
      </header>
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <button key={tab.name} onClick={() => setActiveTab(tab.name)} className={`flex items-center flex-shrink-0 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.name ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {renderContent()}
      </div>

      {fichaService && (
        <FichaServicioModal
          service={fichaService}
          menu={serviceMenus[fichaService.id]}
          practicaGroups={[...new Set([...fichaService.groupAssignments.comedor, ...fichaService.groupAssignments.takeaway])]}
          onClose={() => setFichaService(null)}
          onSave={(menu) => {
            setServiceMenus(prev => ({ ...prev, [fichaService.id]: menu }));
            setFichaService(null);
          }}
        />
      )}
    </div>
  );
};


// --- FICHA DE SERVICIO MODAL ---
interface FichaServicioModalProps {
    service: Service;
    menu: ServiceMenu;
    practicaGroups: string[];
    onClose: () => void;
    onSave: (menu: ServiceMenu) => void;
}

const FichaServicioModal: React.FC<FichaServicioModalProps> = ({ service, menu, practicaGroups, onClose, onSave }) => {
    const [currentMenu, setCurrentMenu] = useState<ServiceMenu>(() => {
        // Ensure menu object has all keys, even if empty
        return {
            comedor: menu?.comedor || [],
            takeaway: menu?.takeaway || [],
            familia: menu?.familia || [],
        };
    });

    const handleSave = () => {
        onSave(currentMenu);
    };

    const assignmentOptions = useMemo(() => [...practicaGroups, 'Comida de Familia'], [practicaGroups]);

    const assignmentSummary = useMemo(() => {
        const summary: { [group: string]: string[] } = {};
        
        const processDishes = (dishes: ServiceDish[], type: string) => {
            dishes.forEach(dish => {
                const group = dish.assignedGroup || 'Sin asignar';
                if (!summary[group]) summary[group] = [];
                summary[group].push(`${dish.name} (${type})`);
            });
        };

        processDishes(currentMenu.comedor, 'Comedor');
        processDishes(currentMenu.takeaway, 'Takeaway');
        processDishes(currentMenu.familia, 'Familia');

        return Object.entries(summary);
    }, [currentMenu]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <div className="bg-gray-50 rounded-lg shadow-xl w-full max-w-6xl transform transition-all flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="p-5 border-b bg-white rounded-t-lg flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Ficha de Servicio: {service.name}</h2>
                        <p className="text-sm text-gray-500">{new Date(service.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full"><CloseIcon className="h-6 w-6"/></button>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 overflow-y-auto space-y-6">
                    {/* Summary */}
                    <details className="bg-white p-4 rounded-lg shadow-sm border">
                        <summary className="font-bold text-lg cursor-pointer text-gray-700">Resumen de Asignaciones</summary>
                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {assignmentSummary.length > 0 ? assignmentSummary.map(([group, dishes]) => (
                                <div key={group} className="bg-gray-50 p-3 rounded">
                                    <h4 className="font-semibold text-gray-800">{group}</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                        {dishes.map((dish, i) => <li key={i}>{dish}</li>)}
                                    </ul>
                                </div>
                            )) : <p className="text-sm text-gray-500 italic col-span-full">Aún no hay platos asignados.</p>}
                        </div>
                    </details>
                    
                    {/* Menu Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <DishSection 
                            title="Menú Comedor" 
                            dishes={currentMenu.comedor}
                            assignmentOptions={assignmentOptions}
                            onDishesChange={(newDishes) => setCurrentMenu(prev => ({ ...prev, comedor: newDishes }))}
                        />
                         <DishSection 
                            title="Menú Takeaway" 
                            dishes={currentMenu.takeaway}
                            assignmentOptions={assignmentOptions}
                            onDishesChange={(newDishes) => setCurrentMenu(prev => ({ ...prev, takeaway: newDishes }))}
                        />
                         <DishSection 
                            title="Comida de Familia" 
                            dishes={currentMenu.familia}
                            assignmentOptions={assignmentOptions}
                            onDishesChange={(newDishes) => setCurrentMenu(prev => ({ ...prev, familia: newDishes }))}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t rounded-b-lg flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cerrar</button>
                    <button onClick={handleSave} className="px-8 py-2 bg-teal-500 text-white font-bold rounded-md hover:bg-teal-600">Guardar Ficha</button>
                </div>
            </div>
        </div>
    );
};

interface DishSectionProps {
    title: string;
    dishes: ServiceDish[];
    assignmentOptions: string[];
    onDishesChange: (newDishes: ServiceDish[]) => void;
}

const DishSection: React.FC<DishSectionProps> = ({ title, dishes, assignmentOptions, onDishesChange }) => {
    
    const handleDishChange = (id: string, field: 'name' | 'assignedGroup', value: string) => {
        onDishesChange(dishes.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const handleNewDishInput = (value: string) => {
        if (value.trim()) {
            const newDish: ServiceDish = { id: uuidv4(), name: value, assignedGroup: '' };
            onDishesChange([...dishes, newDish]);
        }
    };
    
    const handleDeleteDish = (id: string) => {
        onDishesChange(dishes.filter(d => d.id !== id));
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border h-full flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h3>
            <div className="space-y-3 flex-grow">
                {dishes.map(dish => (
                    <div key={dish.id} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={dish.name}
                            onChange={(e) => handleDishChange(dish.id, 'name', e.target.value)}
                            placeholder="Nombre del plato..."
                            className="flex-grow p-2 border rounded-md text-sm"
                        />
                        <select
                            value={dish.assignedGroup}
                            onChange={(e) => handleDishChange(dish.id, 'assignedGroup', e.target.value)}
                            className="p-2 border rounded-md text-sm bg-white"
                        >
                            <option value="">Asignar a...</option>
                            {assignmentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                         <button onClick={() => handleDeleteDish(dish.id)} className="text-gray-400 hover:text-red-600 p-1"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                ))}
                 {/* Auto-add input */}
                 <input
                    type="text"
                    key={`new-${dishes.length}`}
                    placeholder="+ Añadir plato..."
                    onBlur={(e) => {
                        handleNewDishInput(e.target.value);
                        e.target.value = ''; // Clear after adding
                    }}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                             e.preventDefault();
                             handleNewDishInput(e.currentTarget.value);
                             e.currentTarget.value = ''; // Clear after adding
                        }
                    }}
                    className="flex-grow p-2 border border-dashed rounded-md text-sm w-full"
                />
            </div>
        </div>
    );
}

export default GestionPracticaView;