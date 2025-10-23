
import React, { useState, useMemo, useEffect } from 'react';
import { Student, EvaluationsState, Service, StudentGroupAssignments, EvaluationItemScore, StudentPracticalExam, TheoreticalExamGrades, Interview, Annotation, CourseGrades, CourseModuleGrades } from '../types';
import { CloseIcon, PencilIcon, PlusIcon } from './icons';
import { ACADEMIC_EVALUATION_STRUCTURE, COURSE_MODULES } from '../constants';


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

const calculateScore = (scores: EvaluationItemScore[]): number => {
  if (!scores) return 0;
  return scores.reduce((sum, item) => sum + (item.score || 0), 0);
};

const getGradeBadgeClass = (score: number | null | undefined) => {
  if (score === null || score === undefined) return 'bg-gray-100 text-gray-800';
  if (score >= 9) return 'bg-green-100 text-green-800';
  if (score >= 7) return 'bg-blue-100 text-blue-800';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const getGradeTextClass = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 9) return 'text-green-700';
    if (score >= 7) return 'text-blue-700';
    if (score >= 5) return 'text-yellow-700';
    return 'text-red-700';
};

const getAnnotationColor = (type: 'positive' | 'negative' | 'neutral') => {
  switch (type) {
    case 'positive': return 'border-green-500';
    case 'negative': return 'border-red-500';
    default: return 'border-gray-400';
  }
};

const calculateFinalGrade = (grades: CourseModuleGrades | undefined, trimesters: number): number | null => {
    if (!grades) return null;
    const { t1, t2, t3 } = grades;
    let sum = 0;
    let count = 0;

    if (t1 !== undefined && t1 !== null) { sum += t1; count++; }
    if (t2 !== undefined && t2 !== null) { sum += t2; count++; }
    if (trimesters === 3 && t3 !== undefined && t3 !== null) { sum += t3; count++; }
    
    if (count === 0) return null;
    
    return sum / count;
};


interface StudentDetailModalProps {
    student: Student;
    evaluations: EvaluationsState;
    practicalExams: StudentPracticalExam[];
    academicGrades: {[nre: string]: TheoreticalExamGrades};
    courseGrades: {[nre: string]: CourseGrades};
    onClose: () => void;
    onEdit: (student: Student) => void;
    onUpdateStudent: (student: Student) => void;
}

const AcademicSummary: React.FC<{
    student: Student;
    evaluations: EvaluationsState;
    practicalExams: StudentPracticalExam[];
    academicGrades: {[nre: string]: TheoreticalExamGrades};
}> = ({ student, evaluations, practicalExams, academicGrades }) => {
    const services = useMemo(() => safeJsonParse<Service[]>('practicaServices', []), []);
    const studentGroupAssignments = useMemo(() => safeJsonParse<StudentGroupAssignments>('studentGroupAssignments', {}), []);

    const calculatedGrades = useMemo(() => {
        const grades: { [key: string]: number | null } = {};

        const servicesT1 = services.filter(s => s.trimestre === 1);
        let totalScoreT1 = 0;
        let servicesCountT1 = 0;
        servicesT1.forEach(service => {
            const indEval = evaluations.individual.find(e => e.serviceId === service.id && e.studentNre === student.nre);
            if (indEval?.attendance === 'present') {
                const practiceGroup = studentGroupAssignments[student.nre];
                const groupEval = evaluations.group.find(e => e.serviceId === service.id && e.groupId === practiceGroup);
                const individualScore = calculateScore(indEval.scores);
                const groupScore = groupEval ? calculateScore(groupEval.scores) : 0;
                totalScoreT1 += (individualScore + groupScore);
                servicesCountT1++;
            }
        });
        grades['servicios1'] = servicesCountT1 > 0 ? (totalScoreT1 / servicesCountT1) / 2 : null;

        const servicesT2 = services.filter(s => s.trimestre === 2);
        let totalScoreT2 = 0;
        let servicesCountT2 = 0;
        servicesT2.forEach(service => {
            const indEval = evaluations.individual.find(e => e.serviceId === service.id && e.studentNre === student.nre);
            if (indEval?.attendance === 'present') {
                const practiceGroup = studentGroupAssignments[student.nre];
                const groupEval = evaluations.group.find(e => e.serviceId === service.id && e.groupId === practiceGroup);
                const individualScore = calculateScore(indEval.scores);
                const groupScore = groupEval ? calculateScore(groupEval.scores) : 0;
                totalScoreT2 += (individualScore + groupScore);
                servicesCountT2++;
            }
        });
        grades['servicios2'] = servicesCountT2 > 0 ? (totalScoreT2 / servicesCountT2) / 2 : null;

        const examT1 = practicalExams.find(e => e.studentNre === student.nre && e.examType === 'T1');
        grades['exPractico1'] = examT1?.finalScore ?? null;
        
        const examT2 = practicalExams.find(e => e.studentNre === student.nre && e.examType === 'T2');
        grades['exPractico2'] = examT2?.finalScore ?? null;

        const examRec = practicalExams.find(e => e.studentNre === student.nre && e.examType === 'REC');
        grades['exPracticoRec'] = examRec?.finalScore ?? null;

        return grades;
    }, [services, evaluations, practicalExams, student, studentGroupAssignments]);

    const theoreticalGrades = academicGrades[student.nre] || {};

    const renderGradeCell = (inst: any) => {
        const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
        const displayGrade = grade !== null && grade !== undefined ? grade.toFixed(2) : 'N/A';
        const color = getGradeTextClass(grade);
        
        return (
            <div className="text-center">
                <span className={`font-bold ${color}`}>{displayGrade}</span>
                <p className="text-xs text-gray-500">{inst.name}</p>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-lg text-gray-800 mb-3 border-b pb-2">Evaluación Continua (Módulo Principal)</h3>
                {ACADEMIC_EVALUATION_STRUCTURE.trimestres.map(trimestre => {
                    let weightedTotal = 0;
                    let totalWeight = 0;
                    trimestre.instruments.forEach(inst => {
                        const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
                        if (typeof grade === 'number' && !isNaN(grade)) {
                            weightedTotal += grade * inst.weight;
                            totalWeight += inst.weight;
                        }
                    });
                    const trimestreAverage = totalWeight > 0 ? weightedTotal / totalWeight : 0;

                    return (
                        <div key={trimestre.name} className="mt-4">
                            <div className="flex justify-between items-baseline">
                                <h4 className="font-semibold text-gray-800">{trimestre.name}</h4>
                                <div className="text-right">
                                    <span className={`font-bold text-xl ${getGradeTextClass(trimestreAverage)}`}>{(trimestreAverage).toFixed(2)}</span>
                                    <span className="text-sm text-gray-500"> / 10</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 bg-gray-50 p-3 rounded-md">
                                {trimestre.instruments.map(inst => (
                                    <div key={inst.key}>{renderGradeCell(inst)}</div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div>
                 <h3 className="font-bold text-lg text-gray-800 mb-3 border-b pb-2">Recuperación (Módulo Principal)</h3>
                {(() => {
                    let weightedTotalRec = 0;
                    let totalWeightRec = 0;
                    ACADEMIC_EVALUATION_STRUCTURE.recuperacion.instruments.forEach(inst => {
                        const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
                        if (typeof grade === 'number' && !isNaN(grade)) {
                            weightedTotalRec += grade * inst.weight;
                            totalWeightRec += inst.weight;
                        }
                    });
                    const recAverage = totalWeightRec > 0 ? weightedTotalRec / totalWeightRec : 0;
                    return (
                         <div className="mt-4">
                            <div className="flex justify-between items-baseline">
                                <h4 className="font-semibold text-gray-800">{ACADEMIC_EVALUATION_STRUCTURE.recuperacion.name}</h4>
                                <div className="text-right">
                                    <span className={`font-bold text-xl ${getGradeTextClass(recAverage)}`}>{(recAverage).toFixed(2)}</span>
                                    <span className="text-sm text-gray-500"> / 10</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2 bg-gray-50 p-3 rounded-md">
                                {ACADEMIC_EVALUATION_STRUCTURE.recuperacion.instruments.map(inst => (
                                    <div key={inst.key}>{renderGradeCell(inst)}</div>
                                ))}
                            </div>
                        </div>
                    )
                })()}
            </div>
        </div>
    );
};

const GeneralInfoTab: React.FC<{
    student: Student;
    courseGrades: {[nre: string]: CourseGrades};
    onUpdateStudent: (student: Student) => void;
}> = ({ student, courseGrades, onUpdateStudent }) => {
    const [localStudent, setLocalStudent] = useState<Student>(student);
    const [isAddingInterview, setIsAddingInterview] = useState(false);
    const [newInterview, setNewInterview] = useState({ date: '', attendees: '', notes: '' });

    const studentCourseGrades = courseGrades[student.nre];

    useEffect(() => {
        setLocalStudent(student);
    }, [student]);

    const earlyDepartures = useMemo(() => 
        (localStudent.anotaciones || []).filter(a => a.subtype === 'early_departure').slice().reverse(),
        [localStudent.anotaciones]
    );

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
        <div className="space-y-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
                <h2 className="text-md font-bold mb-2 text-gray-700">Datos Personales</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    <div><span className="font-semibold text-gray-500">NRE:</span> {localStudent.nre}</div>
                    <div><span className="font-semibold text-gray-500">Expediente:</span> {localStudent.expediente}</div>
                    <div><span className="font-semibold text-gray-500">Grupo:</span> {localStudent.grupo} ({localStudent.subgrupo})</div>
                    <div><span className="font-semibold text-gray-500">Nacimiento:</span> {localStudent.fechaNacimiento}</div>
                    <div><span className="font-semibold text-gray-500">Teléfono:</span> {localStudent.telefono}</div>
                    <div><span className="font-semibold text-gray-500">Teléfono 2:</span> {localStudent.telefono2 || '-'}</div>
                    <div className="col-span-full"><span className="font-semibold text-gray-500">Email Personal:</span> {localStudent.emailPersonal}</div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                    <h2 className="text-md font-bold mb-2 text-gray-700">Resumen de Otros Módulos</h2>
                    <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="py-1 px-2 text-left font-semibold text-gray-600">Módulo</th>
                                    <th className="py-1 px-2 text-center font-semibold text-gray-600 w-10">T1</th>
                                    <th className="py-1 px-2 text-center font-semibold text-gray-600 w-10">T2</th>
                                    <th className="py-1 px-2 text-center font-semibold text-gray-600 w-10">T3</th>
                                    <th className="py-1 px-2 text-center font-semibold text-gray-600 w-12">FINAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COURSE_MODULES.map(module => {
                                    const grades = studentCourseGrades?.[module.key];
                                    const finalGrade = calculateFinalGrade(grades, module.trimesters);
                                    return (
                                        <tr key={module.key} className="border-t">
                                            <td className="py-1 px-2 font-medium text-gray-800">{module.name}</td>
                                            <td className={`py-1 px-2 text-center font-semibold ${getGradeTextClass(grades?.t1)}`}>{grades?.t1?.toFixed(1) ?? '-'}</td>
                                            <td className={`py-1 px-2 text-center font-semibold ${getGradeTextClass(grades?.t2)}`}>{grades?.t2?.toFixed(1) ?? '-'}</td>
                                            <td className={`py-1 px-2 text-center font-semibold ${getGradeTextClass(grades?.t3)}`}>
                                                {module.trimesters === 3 ? (grades?.t3?.toFixed(1) ?? '-') : ''}
                                            </td>
                                            <td className={`py-1 px-2 text-center font-bold ${getGradeTextClass(finalGrade)}`}>{finalGrade !== null ? finalGrade.toFixed(2) : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                 <div className="bg-white p-3 rounded-lg shadow-sm">
                     <div className="flex justify-between items-center mb-2">
                        <h2 className="text-md font-bold text-gray-700">Entrevistas y Tutorías</h2>
                        <button onClick={() => setIsAddingInterview(!isAddingInterview)} className="text-teal-500 hover:text-teal-700 font-semibold text-xs flex items-center">
                            <PlusIcon className="h-3 w-3 mr-1" /> {isAddingInterview ? 'Cancelar' : 'Añadir'}
                        </button>
                    </div>
                    {isAddingInterview && (
                        <div className="bg-gray-50 p-3 rounded-md mb-2 space-y-2 text-xs">
                            <input type="date" value={newInterview.date} onChange={e => setNewInterview({...newInterview, date: e.target.value})} className="w-full p-1 border rounded"/>
                            <input type="text" placeholder="Asistentes" value={newInterview.attendees} onChange={e => setNewInterview({...newInterview, attendees: e.target.value})} className="w-full p-1 border rounded"/>
                            <textarea placeholder="Observaciones..." value={newInterview.notes} onChange={e => setNewInterview({...newInterview, notes: e.target.value})} className="w-full p-1 border rounded" rows={2}></textarea>
                            <div className="text-right">
                                <button onClick={handleSaveInterview} className="px-3 py-1 bg-teal-500 text-white rounded text-xs">Guardar</button>
                            </div>
                        </div>
                    )}
                    <div className="max-h-36 overflow-y-auto pr-2 space-y-2">
                        {(localStudent.entrevistas || []).slice().reverse().map(interview => (
                            <details key={interview.id} className="p-2 bg-gray-50 rounded-md text-xs">
                                <summary className="font-semibold cursor-pointer">{new Date(interview.date).toLocaleDateString()} - {interview.attendees}</summary>
                                <p className="mt-1 text-gray-600 whitespace-pre-wrap">{interview.notes}</p>
                            </details>
                        ))}
                         {(localStudent.entrevistas || []).length === 0 && <p className="text-xs text-gray-500 italic">No hay entrevistas.</p>}
                    </div>
                </div>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                    <h2 className="text-md font-bold mb-2 text-yellow-700">Registro de Salidas Anticipadas</h2>
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                        {earlyDepartures.length > 0 ? earlyDepartures.map(annotation => (
                            <div key={annotation.id} className={`p-2 border-l-4 border-yellow-500 bg-yellow-50`}>
                                <p className="text-xs text-gray-800">{annotation.note}</p>
                                <p className="text-xxs text-gray-400 mt-1">{new Date(annotation.date).toLocaleDateString()}</p>
                            </div>
                        )) : (
                            <p className="text-xs text-gray-500 italic">No hay registros de salidas anticipadas.</p>
                        )}
                    </div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                    <h2 className="text-md font-bold mb-2 text-gray-700">Anotaciones Generales Recientes</h2>
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                        {(localStudent.anotaciones || []).slice().reverse().map(annotation => (
                            <div key={annotation.id} className={`p-2 border-l-4 ${getAnnotationColor(annotation.type)} bg-gray-50`}>
                                <p className="text-xs text-gray-800">{annotation.note}</p>
                                <p className="text-xxs text-gray-400 mt-1">{new Date(annotation.date).toLocaleDateString()}</p>
                            </div>
                        ))}
                        {(localStudent.anotaciones || []).length === 0 && <p className="text-xs text-gray-500 italic">No hay anotaciones.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, evaluations, practicalExams, academicGrades, courseGrades, onClose, onEdit, onUpdateStudent }) => {

    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'Información General' },
        { id: 'academico', label: 'Resumen Académico' }
    ];

    const renderTabContent = () => {
        switch(activeTab) {
            case 'general':
                return <GeneralInfoTab student={student} courseGrades={courseGrades} onUpdateStudent={onUpdateStudent} />;
            case 'academico':
                 return <AcademicSummary student={student} evaluations={evaluations} practicalExams={practicalExams} academicGrades={academicGrades} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
             <div className="bg-gray-100 rounded-lg shadow-xl w-full max-w-5xl transform transition-all flex flex-col max-h-[95vh]">
                {/* Modal Header */}
                <div className="p-4 bg-white border-b border-gray-200 rounded-t-lg flex justify-between items-start">
                    <div className="flex items-center">
                        <img src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.nre}`} alt="Foto" className="h-16 w-16 rounded-full border-2 border-gray-200" />
                        <div className="ml-4">
                            <h2 className="text-2xl font-bold text-gray-800">{student.apellido1} {student.apellido2}, {student.nombre}</h2>
                            <p className="text-sm text-gray-500">{student.grupo} | {student.emailOficial}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => onEdit(student)} className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center p-2 rounded-md bg-blue-50 hover:bg-blue-100">
                            <PencilIcon className="h-4 w-4 mr-1"/> Editar Ficha
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100">
                            <CloseIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 bg-white">
                    <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-teal-500 text-teal-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Modal Body */}
                <div className="p-4 flex-1 overflow-y-auto">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};
