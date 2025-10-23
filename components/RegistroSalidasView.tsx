import React, { useState, useMemo } from 'react';
import { Student, Annotation } from '../types';
import { PlusIcon, SearchIcon } from './icons';

interface RegistroSalidasViewProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const RegistroSalidasView: React.FC<RegistroSalidasViewProps> = ({ students, setStudents }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStudentNres, setSelectedStudentNres] = useState<Set<string>>(new Set());
    const [departureNote, setDepartureNote] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [saveMessage, setSaveMessage] = useState('');

    const filteredStudents = useMemo(() => {
        return students
            .filter(s =>
                `${s.nombre} ${s.apellido1} ${s.apellido2}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [students, searchTerm]);

    const handleStudentSelect = (nre: string) => {
        setSelectedStudentNres(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nre)) {
                newSet.delete(nre);
            } else {
                newSet.add(nre);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        if (selectedStudentNres.size === 0) {
            alert("Por favor, selecciona al menos un alumno.");
            return;
        }
        if (!departureNote.trim()) {
            alert("Por favor, escribe el motivo o la hora de la salida.");
            return;
        }

        setStudents(prevStudents => {
            return prevStudents.map(student => {
                if (selectedStudentNres.has(student.nre)) {
                    const newAnnotation: Annotation = {
                        id: `ann_dep_${Date.now()}_${Math.random()}`,
                        date: selectedDate,
                        note: departureNote.trim(),
                        type: 'negative',
                        subtype: 'early_departure'
                    };
                    const updatedAnnotations = [...(student.anotaciones || []), newAnnotation];
                    return { ...student, anotaciones: updatedAnnotations };
                }
                return student;
            });
        });

        setSaveMessage(`${selectedStudentNres.size} registro(s) guardado(s) con éxito.`);
        setTimeout(() => setSaveMessage(''), 3000);

        // Reset form
        setSelectedStudentNres(new Set());
        setDepartureNote('');
    };

    const selectedStudentsList = useMemo(() => {
        return students.filter(s => selectedStudentNres.has(s.nre));
    }, [selectedStudentNres, students]);

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Registro de Salidas Anticipadas</h1>
                <p className="mt-2 text-gray-600">Selecciona la fecha, los alumnos que se marcharon antes de tiempo y anota el motivo.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Student List */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                         <div className="flex-1">
                            <label htmlFor="departureDate" className="block text-sm font-medium text-gray-700">Fecha del Registro</label>
                            <input
                                type="date"
                                id="departureDate"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            />
                        </div>
                        <div className="flex-1">
                             <label htmlFor="searchStudent" className="block text-sm font-medium text-gray-700">Buscar Alumno</label>
                             <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="searchStudent"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre..."
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                        {filteredStudents.map(student => (
                             <div key={student.nre} onClick={() => handleStudentSelect(student.nre)} className={`flex items-center p-3 cursor-pointer border-b last:border-b-0 transition-colors ${selectedStudentNres.has(student.nre) ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="checkbox"
                                    checked={selectedStudentNres.has(student.nre)}
                                    readOnly
                                    className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <img src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.nre}`} alt="" className="h-10 w-10 rounded-full ml-4"/>
                                <div className="ml-4">
                                    <p className="font-semibold text-gray-800">{student.apellido1} {student.apellido2}, {student.nombre}</p>
                                    <p className="text-sm text-gray-500">{student.grupo}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Detalles de la Salida</h2>
                        <div className="mb-4">
                            <h3 className="font-semibold text-gray-700">Alumnos Seleccionados ({selectedStudentNres.size})</h3>
                            {selectedStudentNres.size > 0 ? (
                                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                                   {selectedStudentsList.map(s => <li key={s.nre}>{s.apellido1}, {s.nombre}</li>)}
                                </ul>
                            ) : (
                                <p className="mt-2 text-sm text-gray-500 italic">Ningún alumno seleccionado.</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="departureNote" className="block text-sm font-medium text-gray-700">Motivo / Hora de la Salida</label>
                            <textarea
                                id="departureNote"
                                value={departureNote}
                                onChange={e => setDepartureNote(e.target.value)}
                                rows={4}
                                placeholder="Ej: Se marcha a las 14:30 por cita médica."
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={selectedStudentNres.size === 0 || !departureNote.trim()}
                            className="w-full mt-6 bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Guardar Registro
                        </button>
                        {saveMessage && (
                            <div className="mt-4 text-center p-2 bg-green-100 text-green-800 text-sm font-semibold rounded-md">
                                {saveMessage}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegistroSalidasView;