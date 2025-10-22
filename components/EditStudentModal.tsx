import React, { useState, useEffect } from 'react';
import { Student } from '../types';

interface AddEditStudentModalProps {
  student: Student | null; // If null, we are adding a new student
  onClose: () => void;
  onSave: (student: Student) => void;
}

const EMPTY_STUDENT: Student = {
    nre: '',
    expediente: '',
    apellido1: '',
    apellido2: '',
    nombre: '',
    grupo: '',
    subgrupo: '',
    fechaNacimiento: '',
    telefono: '',
    telefono2: '',
    emailPersonal: '',
    emailOficial: '',
};

// Fix: Define a type for keys of Student that map to string or undefined properties
// to ensure type compatibility with the input element's value prop.
type StudentStringKey = {
    [K in keyof Student]: Student[K] extends string | undefined ? K : never
}[keyof Student];

const AddEditStudentModal: React.FC<AddEditStudentModalProps> = ({ student, onClose, onSave }) => {
  const [formData, setFormData] = useState<Student>(EMPTY_STUDENT);
  const isEditMode = student !== null;

  useEffect(() => {
    setFormData(student || EMPTY_STUDENT);
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.nre && formData.nombre && formData.apellido1) {
       onSave({
           ...formData,
           nre: isEditMode ? formData.nre : formData.nre || String(Date.now()), // Ensure NRE is unique for new students
       });
    } else {
        alert("Por favor, complete al menos NRE, Nombre y Apellido 1.");
    }
  };
  
  const formFields: StudentStringKey[] = ['nre', 'nombre', 'apellido1', 'apellido2', 'expediente', 'grupo', 'subgrupo', 'fechaNacimiento', 'telefono', 'telefono2', 'emailPersonal', 'emailOficial'];


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Editar Alumno' : 'Añadir Nuevo Alumno'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields.map(key => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <input
                    type={key === 'fechaNacimiento' ? 'date' : 'text'}
                    name={key}
                    value={formData[key] || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    disabled={isEditMode && key === 'nre'}
                    required={key === 'nre' || key === 'nombre' || key === 'apellido1'}
                  />
                </div>
            ))}
          </div>
        </form>
        <div className="bg-gray-50 p-4 flex justify-end items-center space-x-4 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors">
            Cancelar
          </button>
          <button type="submit" onClick={handleSubmit} className="px-6 py-2 bg-teal-500 text-white font-bold rounded-md hover:bg-teal-600 transition-colors">
            {isEditMode ? 'Guardar Cambios' : 'Crear Alumno'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEditStudentModal;