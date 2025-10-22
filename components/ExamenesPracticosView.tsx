import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Student, StudentPracticalExam, ExamType } from '../types';
import { PRACTICAL_EXAM_RUBRIC_T1, PRACTICAL_EXAM_RUBRIC_T2, SCORE_LEVELS } from '../constants';
import { TrashIcon, CheckIcon } from './icons';

interface ExamenesPracticosViewProps {
  students: Student[];
  exams: StudentPracticalExam[];
  setExams: React.Dispatch<React.SetStateAction<StudentPracticalExam[]>>;
}

const RubricItem: React.FC<{
    criterion: any;
    scoreData: { score: number; notes: string } | undefined;
    onScoreChange: (score: number, notes: string) => void;
}> = ({ criterion, scoreData, onScoreChange }) => {
    return (
        <div className="py-4 border-b last:border-b-0">
            <p className="font-semibold text-gray-700">{criterion.text}</p>
            <div className="flex flex-wrap gap-2 mt-3 mb-2">
                {SCORE_LEVELS.map(level => (
                    <button
                        key={level.value}
                        onClick={() => onScoreChange(level.value, scoreData?.notes || '')}
                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${
                            scoreData?.score === level.value
                                ? `${level.color} ${level.textColor} ring-2 ring-offset-1 ${level.color.replace('bg','ring')}`
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={criterion.levels[level.value]}
                    >
                        {level.label}
                    </button>
                ))}
            </div>
            <textarea
                value={scoreData?.notes || ''}
                onChange={(e) => onScoreChange(scoreData?.score || 0, e.target.value)}
                placeholder="Anotaciones específicas..."
                rows={2}
                className="w-full mt-2 p-2 border rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
            ></textarea>
        </div>
    );
};


const ExamenesPracticosView: React.FC<ExamenesPracticosViewProps> = ({ students, exams, setExams }) => {
    const [activeTab, setActiveTab] = useState<ExamType>('T1');
    const [selectedStudentNre, setSelectedStudentNre] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    type SaveStatus = 'idle' | 'saving' | 'saved';
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) =>
            `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`)
        );
    }, [students]);
    
    const filteredStudents = useMemo(() => {
        if (!searchTerm) return sortedStudents;
        return sortedStudents.filter(s => 
            `${s.nombre} ${s.apellido1} ${s.apellido2}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedStudents, searchTerm]);


    useEffect(() => {
        if (!selectedStudentNre && filteredStudents.length > 0) {
            setSelectedStudentNre(filteredStudents[0].nre);
        } else if (filteredStudents.length > 0 && !filteredStudents.some(s => s.nre === selectedStudentNre)) {
            setSelectedStudentNre(filteredStudents[0].nre);
        } else if (filteredStudents.length === 0) {
            setSelectedStudentNre(null);
        }
    }, [filteredStudents, selectedStudentNre]);

    const selectedStudent = useMemo(() => {
        return students.find(s => s.nre === selectedStudentNre);
    }, [selectedStudentNre, students]);

    const activeRubric = useMemo(() => {
        switch (activeTab) {
            case 'T1':
            case 'REC':
                return PRACTICAL_EXAM_RUBRIC_T1;
            case 'T2':
                return PRACTICAL_EXAM_RUBRIC_T2;
            default:
                return [];
        }
    }, [activeTab]);

    const studentExam = useMemo(() => {
        return exams.find(e => e.studentNre === selectedStudentNre && e.examType === activeTab);
    }, [exams, selectedStudentNre, activeTab]);

    const updateExamData = useCallback((studentNre: string, examType: ExamType, updates: Partial<StudentPracticalExam>) => {
        setSaveStatus('idle'); // Any change makes it "unsaved"
        setExams(prevExams => {
            const existingExamIndex = prevExams.findIndex(e => e.studentNre === studentNre && e.examType === examType);
            let newExams = [...prevExams];
            
            if (existingExamIndex > -1) {
                const updatedExam = { ...newExams[existingExamIndex], ...updates };
                newExams[existingExamIndex] = updatedExam;
            } else {
                const newExam: StudentPracticalExam = { studentNre, examType, scores: [], ...updates };
                newExams.push(newExam);
            }
            return newExams;
        });
    }, [setExams]);

    const handleScoreChange = useCallback((criterionId: string, score: number, notes: string) => {
        if (!selectedStudentNre) return;
        const newScores = [...(studentExam?.scores || [])];
        const scoreIndex = newScores.findIndex(s => s.criterionId === criterionId);

        if (scoreIndex > -1) {
            newScores[scoreIndex] = { criterionId, score, notes };
        } else {
            newScores.push({ criterionId, score, notes });
        }
        updateExamData(selectedStudentNre, activeTab, { scores: newScores });
    }, [selectedStudentNre, activeTab, studentExam, updateExamData]);
    
    const handleClearSection = useCallback((raId: string) => {
        if (!selectedStudentNre || !studentExam) return;

        const sectionToClear = activeRubric.find(ra => ra.id === raId);
        if (!sectionToClear) return;
        
        if (window.confirm(`¿Estás seguro de que quieres borrar todas las notas y observaciones de la sección "${sectionToClear.title}"?`)) {
            const criteriaIdsToClear = new Set(sectionToClear.criteria.map((c: any) => c.id));
            const newScores = studentExam.scores.filter(s => !criteriaIdsToClear.has(s.criterionId));
            updateExamData(selectedStudentNre, activeTab, { scores: newScores });
        }
    }, [selectedStudentNre, studentExam, activeRubric, activeTab, updateExamData]);

    const handleSaveExam = useCallback(() => {
        if (!selectedStudentNre) return;
        setSaveStatus('saving');
        // The actual save is handled by setExams -> useEffect in App.tsx. This is for UI feedback.
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000); // Reset after 2 seconds
        }, 500); // Simulate save delay
    }, [selectedStudentNre]);

    const calculateFinalScore = useCallback((exam: StudentPracticalExam | undefined, rubric: any[]) => {
        if (!exam || !rubric) return 0;
        let totalScore = 0;
        rubric.forEach(ra => {
            let raScoreSum = 0;
            ra.criteria.forEach((crit: any) => {
                const scoreEntry = exam.scores.find(s => s.criterionId === crit.id);
                if (scoreEntry) {
                    raScoreSum += scoreEntry.score;
                }
            });
            const raAverage = ra.criteria.length > 0 ? raScoreSum / ra.criteria.length : 0;
            totalScore += raAverage * ra.weight;
        });
        return totalScore;
    }, []);

    useEffect(() => {
        if (studentExam && selectedStudentNre) {
            const newFinalScore = calculateFinalScore(studentExam, activeRubric);
            // Only update if the score is different to avoid re-render loops
            if (studentExam.finalScore !== newFinalScore) {
                updateExamData(selectedStudentNre, activeTab, { finalScore: newFinalScore });
            }
        }
    }, [studentExam?.scores, studentExam?.finalScore, selectedStudentNre, activeTab, activeRubric, calculateFinalScore, updateExamData, studentExam]);
    
    const finalScore = studentExam?.finalScore ?? 0;

    const gradedStudentsNREs = useMemo(() => {
        return new Set(exams.filter(e => e.examType === activeTab && e.scores.length > 0).map(e => e.studentNre));
    }, [exams, activeTab]);

    const tabs: { key: ExamType; name: string }[] = [
        { key: 'T1', name: '1º Trimestre' },
        { key: 'T2', name: '2º Trimestre' },
        { key: 'REC', name: 'Recuperación' }
    ];

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Exámenes Prácticos</h1>
                <p className="mt-2 text-gray-600">Evalúa los exámenes prácticos de cocina de forma ágil y centralizada.</p>
            </header>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-shrink-0 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.key
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Student List */}
                <aside className="w-full md:w-1/3 lg:w-1/4">
                    <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
                        <h2 className="text-lg font-bold text-gray-800 mb-3">Lista de Alumnos</h2>
                        <input 
                            type="text"
                            placeholder="Buscar alumno..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                        />
                        <div className="flex-1 overflow-y-auto pr-2">
                            {filteredStudents.map(student => (
                                <button
                                    key={student.nre}
                                    onClick={() => setSelectedStudentNre(student.nre)}
                                    className={`w-full flex items-center text-left p-2 rounded-lg mb-1 transition-colors ${
                                        selectedStudentNre === student.nre ? 'bg-teal-100' : 'hover:bg-gray-100'
                                    }`}
                                >
                                    <img
                                        className="h-10 w-10 rounded-full mr-3"
                                        src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.nre}`}
                                        alt=""
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-800 truncate">{student.apellido1} {student.apellido2}, {student.nombre}</p>
                                        <p className="text-xs text-gray-500">{student.grupo}</p>
                                    </div>
                                    {gradedStudentsNREs.has(student.nre) && (
                                        <div className="w-2 h-2 bg-green-500 rounded-full ml-2" title="Evaluado"></div>
                                    )}
                                </button>
                            ))}
                            {filteredStudents.length === 0 && <p className="text-center text-gray-500 pt-8">No se encontraron alumnos.</p>}
                        </div>
                    </div>
                </aside>

                {/* Grading Area */}
                <main className="w-full md:w-2/3 lg:w-3/4">
                    {selectedStudent ? (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-start mb-4 pb-4 border-b">
                                <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.nombre} {selectedStudent.apellido1}</h2>
                                <div className="flex items-center gap-4">
                                    {saveStatus === 'idle' && (
                                        <button onClick={handleSaveExam} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                            Guardar Examen
                                        </button>
                                    )}
                                    {saveStatus === 'saving' && (
                                        <button disabled className="bg-gray-400 text-white font-bold py-2 px-4 rounded-lg cursor-wait">
                                            Guardando...
                                        </button>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <div className="flex items-center gap-1 text-green-600 font-semibold bg-green-100 py-2 px-4 rounded-lg">
                                            <CheckIcon className="h-5 w-5"/>
                                            ¡Guardado!
                                        </div>
                                    )}
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Nota Final</p>
                                        <p className="text-3xl font-bold text-teal-600">{finalScore.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                                {activeRubric.map(ra => (
                                    <details key={ra.id} open className="bg-gray-50 p-3 rounded-lg border">
                                        <summary className="font-bold text-lg text-gray-700 cursor-pointer flex justify-between items-center">
                                            <span>{ra.title} ({ra.weight * 100}%)</span>
                                             <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleClearSection(ra.id);
                                                }}
                                                className="text-gray-400 hover:text-red-600 p-1 rounded-full"
                                                title={`Borrar notas de ${ra.title}`}
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </summary>
                                        <div className="mt-3 pt-3 border-t">
                                            {ra.criteria.map((crit: any) => (
                                                <RubricItem 
                                                    key={crit.id}
                                                    criterion={crit}
                                                    scoreData={studentExam?.scores.find(s => s.criterionId === crit.id)}
                                                    onScoreChange={(score, notes) => handleScoreChange(crit.id, score, notes)}
                                                />
                                            ))}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-lg shadow-md text-center flex items-center justify-center min-h-[50vh]">
                            <p className="text-gray-500">Selecciona un alumno de la lista para comenzar a evaluar.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ExamenesPracticosView;
