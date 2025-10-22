
import React from 'react';
import { Student } from '../types';

interface StudentTableProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentNre: string) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({ students, onSelectStudent, onEditStudent, onDeleteStudent }) => {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NRE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, index) => (
              <tr key={student.nre} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img className="h-10 w-10 rounded-full" src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.nre}`} alt="" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.apellido1} {student.apellido2}, {student.nombre}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.nre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.grupo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.emailOficial}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => onSelectStudent(student)} className="text-teal-600 hover:text-teal-900 mr-3">Ver</button>
                  <button onClick={() => onEditStudent(student)} className="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                  <button onClick={() => onDeleteStudent(student.nre)} className="text-red-600 hover:text-red-900">Eliminar</button>
                </td>
              </tr>
            ))}
             {students.length === 0 && (
                <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">No se encontraron alumnos.</td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;
