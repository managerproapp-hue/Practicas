import React, { useState, useMemo, useCallback } from 'react';
import { Student, EvaluationsState, StudentPracticalExam, TheoreticalExamGrades, CourseGrades } from '../types';
import StudentTable from './StudentTable';
// Fix: Changed default import to named import for StudentDetailModal to match its export type.
import { StudentDetailModal } from './StudentDetailModal';
import ImportModal from './ImportModal';
import AddEditStudentModal from './EditStudentModal';
import { EyeIcon, PencilIcon, TrashIcon, ViewGridIcon, ViewListIcon, PlusIcon, DownloadIcon } from './icons';
import { downloadPdfWithTables, exportToExcel } from './printUtils';

interface AlumnosViewProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  evaluations: EvaluationsState;
  practicalExams: StudentPracticalExam[];
  academicGrades: {[nre: string]: TheoreticalExamGrades};
  courseGrades: {[nre: string]: CourseGrades};
}

type ViewMode = 'grid' | 'list';

const StudentCard: React.FC<{ student: Student; index: number; onSelect: () => void; onEdit: () => void; onDelete: () => void; }> = 
({ student, index, onSelect, onEdit, onDelete }) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col relative">
        <span className="absolute top-2 right-2 bg-teal-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center z-10">{index}</span>
        <div className="p-4 flex-grow">
            <img 
                className="w-24 h-24 rounded-full mx-auto border-4 border-gray-100" 
                src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.nre}`} 
                alt={`${student.nombre} ${student.apellido1}`} 
            />
            <h3 className="text-center mt-3 font-bold text-gray-800">{student.apellido1} {student.apellido2}, {student.nombre}</h3>
            <p className="text-center text-sm text-gray-500">{student.grupo}</p>
        </div>
        <div className="bg-gray-50 p-2 flex justify-around rounded-b-lg">
            <button onClick={onSelect} className="text-gray-500 hover:text-teal-600 p-2 rounded-full transition-colors" title="Ver Detalles"><EyeIcon className="h-5 w-5" /></button>
            <button onClick={onEdit} className="text-gray-500 hover:text-blue-600 p-2 rounded-full transition-colors" title="Editar"><PencilIcon className="h-5 w-5" /></button>
            <button onClick={onDelete} className="text-gray-500 hover:text-red-600 p-2 rounded-full transition-colors" title="Eliminar"><TrashIcon className="h-5 w-5" /></button>
        </div>
    </div>
);


const AlumnosView: React.FC<AlumnosViewProps> = ({ students, setStudents, evaluations, practicalExams, academicGrades, courseGrades }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);

  const filteredStudents = useMemo(() => {
    return students
      .filter(s =>
        `${s.nombre} ${s.apellido1} ${s.apellido2}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.apellido1.localeCompare(b.apellido1));
  }, [students, searchTerm]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setIsAddEditModalOpen(true);
  };

  const handleAddStudent = () => {
    setStudentToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleDeleteStudent = (nre: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
      setStudents(prev => prev.filter(s => s.nre !== nre));
    }
  };

  const handleSaveStudent = (studentData: Student) => {
    setStudents(prev => {
      const existing = prev.find(s => s.nre === studentData.nre);
      if (existing) {
        return prev.map(s => s.nre === studentData.nre ? studentData : s);
      } else {
        return [...prev, studentData];
      }
    });
    setIsAddEditModalOpen(false);
  };
  
  const handleImportSave = (newStudents: Student[]) => {
    setStudents(currentStudents => {
        const studentNREs = new Set(currentStudents.map(s => s.nre));
        const uniqueNewStudents = newStudents.filter(ns => !studentNREs.has(ns.nre));
        return [...currentStudents, ...uniqueNewStudents];
    });
    setIsImportModalOpen(false);
  };
  
  const handleUpdateStudentData = (updatedStudent: Student) => {
      setStudents(prev => prev.map(s => s.nre === updatedStudent.nre ? updatedStudent : s));
  };


  const handleExportPdf = () => {
    const head = [['#', 'Nombre Completo', 'NRE', 'Grupo', 'Email']];
    const body = filteredStudents.map((s, i) => [
      String(i + 1),
      `${s.apellido1} ${s.apellido2}, ${s.nombre}`,
      s.nre,
      s.grupo,
      s.emailOficial,
    ]);
    
    const columnStyles = {
        0: { cellWidth: 10 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 45 },
    };

    downloadPdfWithTables('Listado de Alumnos', 'listado_alumnos', [{ head, body, columnStyles }]);
  };

  const handleExportXlsx = () => {
    const data = filteredStudents.map(s => ({
        'NRE': s.nre,
        'Expediente': s.expediente,
        'Apellido 1': s.apellido1,
        'Apellido 2': s.apellido2,
        'Nombre': s.nombre,
        'Grupo': s.grupo,
        'Subgrupo': s.subgrupo,
        'Fecha Nacimiento': s.fechaNacimiento,
        'Teléfono': s.telefono,
        'Teléfono 2': s.telefono2,
        'Email Personal': s.emailPersonal,
        'Email Oficial': s.emailOficial,
    }));
    exportToExcel(data, 'listado_alumnos', 'Alumnos');
  };

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Alumnos ({students.length}) <span className="text-sm font-bold text-yellow-500 bg-yellow-100 px-2 py-1 rounded-md">v1.2</span></h1>
        <p className="mt-2 text-gray-600">Busca, visualiza, añade o edita la información de tus alumnos.</p>
      </header>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <input
          type="text"
          placeholder="Buscar alumno por nombre..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600'}`}><ViewGridIcon className="h-5 w-5"/></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600'}`}><ViewListIcon className="h-5 w-5"/></button>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <button onClick={handleAddStudent} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center"><PlusIcon className="h-5 w-5 mr-1"/> Añadir Alumno</button>
            <button onClick={() => setIsImportModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Importar</button>
             <div className="relative">
                <button onClick={handleExportPdf} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1">
                    <DownloadIcon className="h-5 w-5"/> PDF
                </button>
            </div>
             <div className="relative">
                <button onClick={handleExportXlsx} className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1">
                    <DownloadIcon className="h-5 w-5"/> XLSX
                </button>
            </div>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredStudents.map((student, index) => (
            <StudentCard
              key={student.nre}
              student={student}
              index={index + 1}
              onSelect={() => handleSelectStudent(student)}
              onEdit={() => handleEditStudent(student)}
              onDelete={() => handleDeleteStudent(student.nre)}
            />
          ))}
        </div>
      ) : (
        <StudentTable
          students={filteredStudents}
          onSelectStudent={handleSelectStudent}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
        />
      )}
      
      {filteredStudents.length === 0 && <p className="text-center text-gray-500 mt-8">No se encontraron alumnos.</p>}

      {isDetailModalOpen && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          evaluations={evaluations}
          practicalExams={practicalExams}
          academicGrades={academicGrades}
          courseGrades={courseGrades}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={(student) => {
            setIsDetailModalOpen(false);
            handleEditStudent(student);
          }}
          onUpdateStudent={handleUpdateStudentData}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onSave={handleImportSave}
        />
      )}

      {isAddEditModalOpen && (
        <AddEditStudentModal
          student={studentToEdit}
          onClose={() => setIsAddEditModalOpen(false)}
          onSave={handleSaveStudent}
        />
      )}
    </div>
  );
};

export default AlumnosView;