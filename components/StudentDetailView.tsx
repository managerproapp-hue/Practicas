import React, { useState } from 'react';
import { Student, Annotation, Interview } from '../types';
import { BackIcon, PlusIcon, PencilIcon } from './icons';

interface StudentDetailViewProps {
  student: Student;
  onBack: () => void;
  onUpdateStudent: (student: Student) => void;
}

const getAnnotationColor = (type: 'positive' | 'negative' | 'neutral') => {
  switch (type) {
    case 'positive': return 'border-green-500';
    case 'negative': return 'border-red-500';
    default: return 'border-gray-400';
  }
};

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ student, onBack, onUpdateStudent }) => {
  const [localStudent, setLocalStudent] = useState<Student>(student);
  const [isAddingInterview, setIsAddingInterview] = useState(false);
  const [newInterview, setNewInterview] = useState({ date: '', attendees: '', notes: '' });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const updatedStudent = { ...localStudent, photoUrl: event.target?.result as string };
        setLocalStudent(updatedStudent);
        onUpdateStudent(updatedStudent);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInterview = () => {
    if(!newInterview.date || !newInterview.notes) return;
    const newInterviewData: Interview = {
        id: `ent_${Date.now()}`,
        ...newInterview
    };
    const updatedStudent = {
        ...localStudent,
        entrevistas: [...(localStudent.entrevistas || []), newInterviewData]
    };
    setLocalStudent(updatedStudent);
    onUpdateStudent(updatedStudent);
    setNewInterview({ date: '', attendees: '', notes: '' });
    setIsAddingInterview(false);
  }

  return (
    <div className="p-8 bg-gray-100 min-h-full">
      <button onClick={onBack} className="flex items-center text-teal-600 hover:text-teal-800 font-semibold mb-6">
        <BackIcon className="h-5 w-5 mr-2" />
        Volver a la lista
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-8">
          {/* Cabecera del Perfil */}
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="text-center">
              <img src={localStudent.photoUrl || `https://i.pravatar.cc/150?u=${localStudent.nre}`} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 mx-auto" />
               <label htmlFor="photo-upload" className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-xs font-semibold cursor-pointer">
                 <PencilIcon className="h-4 w-4 mr-1"/>
                 Cambiar Foto
              </label>
              <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-800">{localStudent.nombre} {localStudent.apellido1} {localStudent.apellido2}</h1>
              <p className="text-gray-500">{localStudent.emailOficial}</p>
            </div>
          </div>

          {/* Datos Personales */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Datos Personales</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="font-semibold text-gray-500">NRE:</span> {localStudent.nre}</div>
                <div><span className="font-semibold text-gray-500">Expediente:</span> {localStudent.expediente}</div>
                <div><span className="font-semibold text-gray-500">Grupo:</span> {localStudent.grupo} ({localStudent.subgrupo})</div>
                <div><span className="font-semibold text-gray-500">Nacimiento:</span> {localStudent.fechaNacimiento}</div>
                <div><span className="font-semibold text-gray-500">Teléfono:</span> {localStudent.telefono}</div>
                <div><span className="font-semibold text-gray-500">Teléfono 2:</span> {localStudent.telefono2 || '-'}</div>
                <div className="col-span-full"><span className="font-semibold text-gray-500">Email Personal:</span> {localStudent.emailPersonal}</div>
            </div>
          </div>
          
          {/* Entrevistas y Tutorías */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-700">Entrevistas y Tutorías</h2>
              <button onClick={() => setIsAddingInterview(!isAddingInterview)} className="text-teal-500 hover:text-teal-700 font-semibold text-sm flex items-center">
                <PlusIcon className="h-4 w-4 mr-1" /> Añadir Entrevista
              </button>
            </div>
            {isAddingInterview && (
                <div className="bg-gray-50 p-4 rounded-md mb-4 space-y-3">
                    <input type="date" value={newInterview.date} onChange={e => setNewInterview({...newInterview, date: e.target.value})} className="w-full p-2 border rounded"/>
                    <input type="text" placeholder="Asistentes (ej. Tutor, Alumno)" value={newInterview.attendees} onChange={e => setNewInterview({...newInterview, attendees: e.target.value})} className="w-full p-2 border rounded"/>
                    <textarea placeholder="Observaciones..." value={newInterview.notes} onChange={e => setNewInterview({...newInterview, notes: e.target.value})} className="w-full p-2 border rounded" rows={3}></textarea>
                    <div className="text-right space-x-2">
                        <button onClick={() => setIsAddingInterview(false)} className="px-4 py-1 bg-gray-200 rounded">Cancelar</button>
                        <button onClick={handleSaveInterview} className="px-4 py-1 bg-teal-500 text-white rounded">Guardar</button>
                    </div>
                </div>
            )}
            <div className="space-y-4">
                {localStudent.entrevistas?.map(interview => (
                    <details key={interview.id} className="p-3 bg-gray-50 rounded-md">
                        <summary className="font-semibold cursor-pointer">{new Date(interview.date).toLocaleDateString()} - {interview.attendees}</summary>
                        <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{interview.notes}</p>
                    </details>
                ))}
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-8">
          {/* Anotaciones */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Anotaciones</h2>
            <div className="space-y-3">
              {localStudent.anotaciones?.map(annotation => (
                <div key={annotation.id} className={`p-3 border-l-4 ${getAnnotationColor(annotation.type)} bg-gray-50`}>
                  <p className="text-sm text-gray-800">{annotation.note}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(annotation.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailView;