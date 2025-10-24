import React, { useState, useMemo, useEffect } from 'react';
import { Student, Service, PlanningAssignments } from '../types';
import { CalendarIcon } from './icons';

// HELPER FUNCTION
const safeJsonParse = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        if (item) {
            return JSON.parse(item);
        }
        return defaultValue;
    } catch (error) {
        console.error(`Error parsing JSON from localStorage key "${key}":`, error);
        localStorage.removeItem(key);
        return defaultValue;
    }
};

// CONSTANTS
const LEADER_ROLES = ["Jefe de Cocina", "2º Jefe de Cocina", "2º Jefe de Takeaway"];
const SECONDARY_ROLES = ["Jefe de Partida", "Cocinero", "Ayudante", "Sin servicio 1", "Sin servicio 2"];

// MAIN VIEW COMPONENT
interface GestionPracticaViewProps {
  students: Student[];
}

const GestionPracticaView: React.FC<GestionPracticaViewProps> = ({ students }) => {
  const [services, setServices] = useState<Service[]>(() => safeJsonParse('practicaServices', []));
  const [planningAssignments, setPlanningAssignments] = useState<PlanningAssignments>(() => safeJsonParse('planningAssignments', {}));

  // Automatic saving effects
  useEffect(() => { localStorage.setItem('practicaServices', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('planningAssignments', JSON.stringify(planningAssignments)); }, [planningAssignments]);

  const sortedStudents = useMemo(() => [...students].sort((a, b) => 
      `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`)), 
  [students]);

  const sortedServices = useMemo(() => [...services].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()),
  [services]);

  const handleRoleChange = (serviceId: string, studentNre: string, newRole: string) => {
      setPlanningAssignments(prev => {
          const newAssignments = JSON.parse(JSON.stringify(prev)); // Deep copy
          const serviceAssignments = newAssignments[serviceId] || {};
          
          if (LEADER_ROLES.includes(newRole)) {
              const currentHolderNre = Object.keys(serviceAssignments).find(nre => serviceAssignments[nre] === newRole);
              if (currentHolderNre && currentHolderNre !== studentNre) {
                  delete serviceAssignments[currentHolderNre];
              }
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
  
  const allRoles = ["Sin asignar", ...LEADER_ROLES, ...SECONDARY_ROLES];

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión Práctica: Planificación</h1>
        <p className="mt-2 text-gray-600">Asigna roles a los alumnos para cada servicio en la matriz de planificación. Los cambios se guardan automáticamente.</p>
      </header>
      
      <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <CalendarIcon className="h-6 w-6 mr-2 text-teal-600"/>
              Matriz de Planificación de Roles
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[75vh]">
              <table className="min-w-full divide-y divide-gray-200 text-sm border-separate" style={{borderSpacing: 0}}>
                  <thead className="bg-gray-50 sticky top-0 z-20">
                      <tr>
                          <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 z-30 border-b border-r">Alumno</th>
                          {sortedServices.map(service => (
                              <th key={service.id} className="px-3 py-3 text-center font-semibold text-gray-600 whitespace-nowrap border-b border-r">
                                  {service.name} <br />
                                  <span className="font-normal text-xs">{new Date(service.date).toLocaleDateString()}</span>
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {sortedStudents.map(student => (
                          <tr key={student.nre} className="hover:bg-gray-50">
                              <td className="sticky left-0 bg-white hover:bg-gray-50 px-3 py-2 font-medium text-gray-800 whitespace-nowrap z-10 border-b border-r">
                                  {student.apellido1} {student.apellido2}, {student.nombre}
                              </td>
                              {sortedServices.map(service => {
                                  const currentRole = planningAssignments[service.id]?.[student.nre] || "Sin asignar";
                                  return (
                                      <td key={service.id} className="px-2 py-1 border-b border-r">
                                          <select 
                                              value={currentRole} 
                                              onChange={e => handleRoleChange(service.id, student.nre, e.target.value)}
                                              className="w-full p-1.5 border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                          >
                                              {allRoles.map(role => (
                                                  <option key={role} value={role}>{role}</option>
                                              ))}
                                          </select>
                                      </td>
                                  );
                              })}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
           {sortedStudents.length === 0 && <p className="text-center text-gray-500 py-8">No hay alumnos para mostrar.</p>}
           {sortedServices.length === 0 && <p className="text-center text-gray-500 py-8">No hay servicios configurados. Para añadir servicios, por favor, contacta con soporte, ya que esta funcionalidad ha sido temporalmente simplificada para garantizar la estabilidad.</p>}
      </div>
    </div>
  );
};

export default GestionPracticaView;
