
import React, { useState, useMemo, useCallback } from 'react';
import { Student, EvaluationsState, Service, StudentGroupAssignments, GroupEvaluation, IndividualEvaluation, EvaluationItemScore, ServiceMenu, Annotation } from '../types';
import { GROUP_EVALUATION_ITEMS, INDIVIDUAL_EVALUATION_ITEMS } from '../constants';
import { BackIcon, CheckIcon, DownloadIcon } from './icons';
import { exportToExcel, downloadPdfWithTables } from './printUtils';

interface GestionNotasViewProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  evaluations: EvaluationsState;
  setEvaluations: React.Dispatch<React.SetStateAction<EvaluationsState>>;
}

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

const calculateScore = (scores: EvaluationItemScore[]): number => {
  if (!scores) return 0;
  return scores.reduce((sum, item) => sum + item.score, 0);
};

// --- SUB-COMPONENTS ---

const EvaluationForm: React.FC<{
    service: Service;
    students: Student[];
    studentGroupAssignments: StudentGroupAssignments;
    evaluations: EvaluationsState;
    setEvaluations: React.Dispatch<React.SetStateAction<EvaluationsState>>;
    onBack: () => void;
    serviceMenus: { [serviceId: string]: ServiceMenu };
}> = ({ service, students, studentGroupAssignments, evaluations, setEvaluations, onBack, serviceMenus }) => {

    const assignedGroups = useMemo(() => {
        return [...new Set([...service.groupAssignments.comedor, ...service.groupAssignments.takeaway])]
            .sort((a, b) => a.localeCompare(b));
    }, [service]);
    
    const menu = serviceMenus[service.id];

    const handleGroupScoreChange = (groupId: string, itemId: string, score: number) => {
        setEvaluations(prev => {
            const newEvals = { ...prev };
            const existingEvalIndex = newEvals.group.findIndex(e => e.serviceId === service.id && e.groupId === groupId);
            
            let targetEval: GroupEvaluation;
            if (existingEvalIndex > -1) {
                targetEval = { ...newEvals.group[existingEvalIndex] };
                newEvals.group[existingEvalIndex] = targetEval;
            } else {
                targetEval = { serviceId: service.id, groupId, scores: [], observation: '' };
                newEvals.group.push(targetEval);
            }

            const scoreIndex = targetEval.scores.findIndex(s => s.itemId === itemId);
            if (scoreIndex > -1) {
                targetEval.scores[scoreIndex] = { itemId, score: isNaN(score) ? 0 : score };
            } else {
                targetEval.scores.push({ itemId, score: isNaN(score) ? 0 : score });
            }
            return newEvals;
        });
    };

    const handleGroupObservationChange = (groupId: string, observation: string) => {
        setEvaluations(prev => {
            const newEvals = { ...prev };
            const existingEvalIndex = newEvals.group.findIndex(e => e.serviceId === service.id && e.groupId === groupId);
             if (existingEvalIndex > -1) {
                newEvals.group[existingEvalIndex] = { ...newEvals.group[existingEvalIndex], observation };
            } else {
                newEvals.group.push({ serviceId: service.id, groupId, scores: [], observation });
            }
            return newEvals;
        });
    };
    
    const handleIndividualAttendanceChange = (studentNre: string, attendance: 'present' | 'absent') => {
        setEvaluations(prev => {
            const newEvals = { ...prev };
            const existingEvalIndex = newEvals.individual.findIndex(e => e.serviceId === service.id && e.studentNre === studentNre);
            if (existingEvalIndex > -1) {
                newEvals.individual[existingEvalIndex] = { ...newEvals.individual[existingEvalIndex], attendance };
            } else {
                newEvals.individual.push({ serviceId: service.id, studentNre, attendance, scores: [], observation: '' });
            }
            return newEvals;
        });
    };

    const handleIndividualScoreChange = (studentNre: string, itemId: string, score: number) => {
         setEvaluations(prev => {
            const newEvals = { ...prev };
            const existingEvalIndex = newEvals.individual.findIndex(e => e.serviceId === service.id && e.studentNre === studentNre);
            
            let targetEval: IndividualEvaluation;
            if (existingEvalIndex > -1) {
                targetEval = { ...newEvals.individual[existingEvalIndex] };
                newEvals.individual[existingEvalIndex] = targetEval;
            } else {
                targetEval = { serviceId: service.id, studentNre, attendance: 'present', scores: [], observation: '' };
                newEvals.individual.push(targetEval);
            }
            
            const scoreIndex = targetEval.scores.findIndex(s => s.itemId === itemId);
            if (scoreIndex > -1) {
                targetEval.scores[scoreIndex] = { itemId, score: isNaN(score) ? 0 : score };
            } else {
                targetEval.scores.push({ itemId, score: isNaN(score) ? 0 : score });
            }
            return newEvals;
        });
    };

    const handleIndividualObservationChange = (studentNre: string, observation: string) => {
        setEvaluations(prev => {
            const newEvals = { ...prev };
            const existingEvalIndex = newEvals.individual.findIndex(e => e.serviceId === service.id && e.studentNre === studentNre);
            if (existingEvalIndex > -1) {
                newEvals.individual[existingEvalIndex] = { ...newEvals.individual[existingEvalIndex], observation };
            } else {
                newEvals.individual.push({ serviceId: service.id, studentNre, attendance: 'present', scores: [], observation });
            }
            return newEvals;
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Evaluando: {service.name}</h2>
                    <p className="text-gray-500">{new Date(service.date).toLocaleDateString()}</p>
                </div>
                <button onClick={onBack} className="flex items-center text-teal-600 hover:text-teal-800 font-semibold">
                    <BackIcon className="h-5 w-5 mr-2" />
                    Volver al resumen
                </button>
            </div>
            
            <div className="space-y-8">
                {assignedGroups.map(groupId => {
                    const studentsInGroup = students
                        .filter(s => studentGroupAssignments[s.nre] === groupId)
                        .sort((a, b) => `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`));
                    const groupEval = evaluations.group.find(e => e.serviceId === service.id && e.groupId === groupId);

                    const assignedDishes = (() => {
                        if (!menu) return [];
                        const dishes = new Set<string>();
                        (menu.comedor || []).forEach(dish => {
                            if (dish.assignedGroup === groupId) dishes.add(dish.name);
                        });
                        (menu.takeaway || []).forEach(dish => {
                            if (dish.assignedGroup === groupId) dishes.add(dish.name);
                        });
                        (menu.familia || []).forEach(dish => {
                            if (dish.assignedGroup === groupId) dishes.add(dish.name);
                        });
                        return Array.from(dishes);
                    })();

                    return (
                        <details key={groupId} open className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <summary className="font-bold text-xl text-gray-700 cursor-pointer">
                                {groupId} ({studentsInGroup.length} alumnos)
                            </summary>
                            <div className="mt-4 pt-4 border-t">
                                {/* Group Evaluation */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-lg text-blue-800 mb-3">Evaluación Grupal</h4>
                                    
                                    {assignedDishes.length > 0 && (
                                        <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-200">
                                            <h5 className="font-semibold text-sm text-blue-900">Platos Asignados en este Servicio</h5>
                                            <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                                                {assignedDishes.map((dishName, index) => (
                                                    <li key={index}>{dishName}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {GROUP_EVALUATION_ITEMS.map(item => {
                                            const currentScore = groupEval?.scores.find(s => s.itemId === item.id)?.score ?? '';
                                            return (
                                                <div key={item.id} className="grid grid-cols-4 items-center gap-4 text-sm">
                                                    <label className="col-span-3 text-gray-700">{item.text}</label>
                                                    <input
                                                        type="number"
                                                        value={currentScore}
                                                        onChange={e => handleGroupScoreChange(groupId, item.id, parseFloat(e.target.value))}
                                                        min="0"
                                                        max={item.points}
                                                        step="0.01"
                                                        placeholder={`Max: ${item.points}`}
                                                        className="p-2 border rounded-md w-24 text-center"
                                                    />
                                                </div>
                                            );
                                        })}
                                         <div>
                                            <label className="block text-sm font-medium text-gray-700 mt-4">Observación Grupal</label>
                                            <textarea 
                                                value={groupEval?.observation || ''}
                                                onChange={e => handleGroupObservationChange(groupId, e.target.value)}
                                                rows={3} className="w-full mt-1 p-2 border rounded-md"></textarea>
                                        </div>
                                    </div>
                                </div>

                                {/* Individual Evaluations */}
                                <div>
                                    <h4 className="font-semibold text-lg text-green-800 mb-3">Evaluaciones Individuales</h4>
                                    <div className="space-y-4">
                                        {studentsInGroup.map((student, index) => {
                                            const individualEval = evaluations.individual.find(e => e.serviceId === service.id && e.studentNre === student.nre);
                                            const isPresent = individualEval?.attendance !== 'absent';
                                            
                                            return (
                                                <details key={student.nre} className="bg-white p-3 rounded-md border">
                                                    <summary className="font-semibold text-md cursor-pointer flex justify-between items-center">
                                                        <div className="flex items-center"><span className="text-sm text-gray-500 w-6">{index + 1}.</span><span>{student.apellido1} {student.apellido2}, {student.nombre}</span></div>
                                                        <div className="flex items-center gap-2">
                                                            <label className={`text-xs font-bold px-2 py-1 rounded-full ${isPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                <input type="checkbox" checked={isPresent} onChange={e => handleIndividualAttendanceChange(student.nre, e.target.checked ? 'present' : 'absent')} className="mr-1"/>
                                                                {isPresent ? 'Presente' : 'Ausente'}
                                                            </label>
                                                        </div>
                                                    </summary>
                                                    {isPresent && (
                                                        <div className="mt-4 pt-4 border-t space-y-3">
                                                            {INDIVIDUAL_EVALUATION_ITEMS.map(item => {
                                                                const currentScore = individualEval?.scores.find(s => s.itemId === item.id)?.score ?? '';
                                                                return (
                                                                    <div key={item.id} className="grid grid-cols-4 items-center gap-4 text-sm">
                                                                        <label className="col-span-3 text-gray-700">{item.text}</label>
                                                                        <input
                                                                            type="number"
                                                                            value={currentScore}
                                                                            onChange={e => handleIndividualScoreChange(student.nre, item.id, parseFloat(e.target.value))}
                                                                            min="0"
                                                                            max={item.points}
                                                                            step="0.01"
                                                                            placeholder={`Max: ${item.points}`}
                                                                            className="p-2 border rounded-md w-24 text-center"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mt-4">Observación Individual</label>
                                                                <textarea 
                                                                    value={individualEval?.observation || ''}
                                                                    onChange={e => handleIndividualObservationChange(student.nre, e.target.value)}
                                                                    rows={2} className="w-full mt-1 p-2 border rounded-md"></textarea>
                                                            </div>
                                                        </div>
                                                    )}
                                                </details>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </details>
                    )
                })}
            </div>
        </div>
    );
};

interface NotasSummaryViewProps {
    students: Student[];
    evaluations: EvaluationsState;
    services: Service[];
    studentGroupAssignments: StudentGroupAssignments;
    onEvaluateService: (serviceId: string) => void;
    studentsByGroup: [string, Student[]][];
    getScoresForStudent: (student: Student) => { serviceScores: Record<string, { group: number | null, individual: number | null }>, average: number };
}

const NotasSummaryView: React.FC<NotasSummaryViewProps> = ({ services, onEvaluateService, studentsByGroup, getScoresForStudent }) => {
    
    if (services.length === 0) {
         return (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h2 className="text-2xl font-bold text-gray-800">No hay servicios configurados</h2>
                <p className="mt-4 text-gray-600">Por favor, ve a "Gestión Práctica" {'>'} "Configuración" para añadir servicios antes de poder evaluarlos.</p>
          </div>
        )
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Alumno</th>
                            {services.map(service => (
                                <th key={service.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    <button onClick={() => onEvaluateService(service.id)} className="hover:text-teal-600">
                                        {service.name} <br/> <span className="font-normal">{new Date(service.date).toLocaleDateString()}</span>
                                    </button>
                                </th>
                            ))}
                             <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Media Final</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {studentsByGroup.map(([groupName, groupStudents]) => (
                            <React.Fragment key={groupName}>
                                <tr>
                                    <td colSpan={services.length + 2} className="px-4 py-2 bg-gray-100 text-sm font-bold text-gray-700 sticky left-0 z-10">{groupName}</td>
                                </tr>
                                {groupStudents.map((student, index) => {
                                    const { serviceScores, average } = getScoresForStudent(student);
                                    return (
                                        <tr key={student.nre} className="hover:bg-gray-50">
                                            <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 z-10 border-r">
                                                <div className="flex items-center">
                                                    <span className="text-gray-500 font-normal w-6 text-right mr-2">{index + 1}.</span>
                                                    <span>{student.apellido1} {student.apellido2}, {student.nombre}</span>
                                                </div>
                                            </td>
                                            {services.map(service => (
                                                <td key={service.id} className="px-3 py-2 text-center text-sm">
                                                    {serviceScores[service.id].group !== null ? (
                                                        <div className="flex justify-center items-center gap-2">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs text-blue-600">G</span>
                                                                <span className="font-semibold text-blue-800">{serviceScores[service.id].group?.toFixed(2)}</span>
                                                            </div>
                                                             <div className="flex flex-col items-center">
                                                                <span className="text-xs text-green-600">I</span>
                                                                <span className="font-semibold text-green-800">{serviceScores[service.id].individual?.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">AUSENTE</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-4 py-2 text-center text-sm font-bold text-gray-800 bg-gray-50">{average.toFixed(2)} / 20.00</td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const GestionNotasView: React.FC<GestionNotasViewProps> = ({ students, setStudents, evaluations, setEvaluations }) => {
    const [view, setView] = useState<'summary' | 'evaluate'>('summary');
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

    const services = useMemo(() => safeJsonParse<Service[]>('practicaServices', []).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), []);
    const studentGroupAssignments = useMemo(() => safeJsonParse<StudentGroupAssignments>('studentGroupAssignments', {}), []);
    const serviceMenus = useMemo(() => safeJsonParse<{ [serviceId: string]: ServiceMenu }>('practicaServiceMenus', {}), []);

    const studentsByGroup = useMemo(() => {
        const grouped: { [key: string]: Student[] } = {};
        students.forEach(s => {
            const groupName = s.grupo || 'Sin Grupo';
            if (!grouped[groupName]) grouped[groupName] = [];
            grouped[groupName].push(s);
        });

        for (const groupName in grouped) {
            grouped[groupName].sort((a, b) => {
                const nameA = `${a.apellido1} ${a.apellido2} ${a.nombre}`.toLowerCase();
                const nameB = `${b.apellido1} ${b.apellido2} ${b.nombre}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });
        }
        
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [students]);

    const getScoresForStudent = useCallback((student: Student) => {
        const serviceScores: { [serviceId: string]: { group: number | null, individual: number | null } } = {};
        let totalScore = 0;
        let servicesCounted = 0;

        services.forEach(service => {
            const indEval = evaluations.individual.find(e => e.serviceId === service.id && e.studentNre === student.nre);
            
            if (indEval && indEval.attendance === 'present') {
                const practiceGroup = studentGroupAssignments[student.nre];
                const groupEval = evaluations.group.find(e => e.serviceId === service.id && e.groupId === practiceGroup);

                const individualScore = calculateScore(indEval.scores);
                const groupScore = groupEval ? calculateScore(groupEval.scores) : 0;
                
                serviceScores[service.id] = { group: groupScore, individual: individualScore };
                totalScore += individualScore + groupScore;
                servicesCounted++;
            } else {
                serviceScores[service.id] = { group: null, individual: null }; // null indicates absence or not graded
            }
        });
        
        const average = servicesCounted > 0 ? totalScore / servicesCounted : 0;

        return { serviceScores, average };

    }, [evaluations, services, studentGroupAssignments]);
    
    const handleExportPdf = () => {
        const head = [
            [
                { content: 'Alumno', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                ...services.map(s => ({ content: s.name, colSpan: 3, styles: { halign: 'center' } })),
                { content: 'Media Final', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
            ],
            services.flatMap(() => [{ content: 'G', styles: { halign: 'center' } }, { content: 'I', styles: { halign: 'center' } }, { content: 'Total', styles: { halign: 'center', fontStyle: 'bold' } }])
        ];
    
        const body: any[][] = [];
    
        studentsByGroup.forEach(([groupName, groupStudents]) => {
            body.push([{ content: groupName, colSpan: services.length * 3 + 2, styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }]);
            
            groupStudents.forEach(student => {
                const { serviceScores, average } = getScoresForStudent(student);
                const rowData: any[] = [
                    `${student.apellido1} ${student.apellido2}, ${student.nombre}`
                ];
                services.forEach(service => {
                    const scores = serviceScores[service.id];
                    if (scores.group !== null) {
                        const total = (scores.group || 0) + (scores.individual || 0);
                        rowData.push(scores.group?.toFixed(2) ?? 'N/A');
                        rowData.push(scores.individual?.toFixed(2) ?? 'N/A');
                        rowData.push({ content: total.toFixed(2), styles: { fontStyle: 'bold' } });
                    } else {
                        rowData.push({ content: 'AUSENTE', colSpan: 3, styles: { halign: 'center', textColor: [220, 38, 38] } });
                    }
                });
                rowData.push({ content: average.toFixed(2), styles: { fontStyle: 'bold' } });
                body.push(rowData);
            });
        });
    
        downloadPdfWithTables(
            'Resumen de Notas de Servicios',
            'notas_servicios',
            [{ head, body }],
            { orientation: 'landscape' }
        );
    };

    const handleExportXlsx = () => {
        const dataToExport: any[] = [];
        studentsByGroup.forEach(([groupName, groupStudents]) => {
            groupStudents.forEach(student => {
                const { serviceScores, average } = getScoresForStudent(student);
                const row: any = {
                    'Grupo Académico': student.grupo,
                    'Alumno': `${student.apellido1} ${student.apellido2}, ${student.nombre}`,
                };
    
                services.forEach(service => {
                    const scores = serviceScores[service.id];
                    const serviceName = service.name.replace(/\s/g, '_');
                    if (scores.group !== null) {
                        row[`${serviceName}_Grupo`] = scores.group?.toFixed(2);
                        row[`${serviceName}_Individual`] = scores.individual?.toFixed(2);
                        row[`${serviceName}_Total`] = ((scores.group || 0) + (scores.individual || 0)).toFixed(2);
                    } else {
                        row[`${serviceName}_Total`] = 'AUSENTE';
                    }
                });
    
                row['Media_Final_Servicios'] = average.toFixed(2);
                dataToExport.push(row);
            });
        });
    
        exportToExcel(dataToExport, 'notas_servicios', 'Notas Servicios');
    };

    const handleSelectService = (serviceId: string) => {
        setSelectedServiceId(serviceId);
        setView('evaluate');
    };

    const handleBackToSummary = () => {
        setSelectedServiceId(null);
        setView('summary');
    };

    const selectedService = useMemo(() => {
        return services.find(s => s.id === selectedServiceId) || null;
    }, [services, selectedServiceId]);

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Notas</h1>
                <p className="mt-2 text-gray-600">Visualiza y registra las calificaciones de las prácticas de servicio.</p>
            </header>

            {view === 'summary' && (
                <div className="flex justify-end gap-2 mb-4">
                    <button onClick={handleExportXlsx} className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1">
                        <DownloadIcon className="h-5 w-5"/> XLSX
                    </button>
                    <button onClick={handleExportPdf} className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1">
                        <DownloadIcon className="h-5 w-5"/> PDF
                    </button>
                </div>
            )}

            {view === 'summary' && (
                <NotasSummaryView 
                    students={students}
                    evaluations={evaluations}
                    services={services}
                    studentGroupAssignments={studentGroupAssignments}
                    onEvaluateService={handleSelectService}
                    studentsByGroup={studentsByGroup}
                    getScoresForStudent={getScoresForStudent}
                />
            )}

            {view === 'evaluate' && selectedService && (
                <EvaluationForm
                    service={selectedService}
                    students={students}
                    studentGroupAssignments={studentGroupAssignments}
                    evaluations={evaluations}
                    setEvaluations={setEvaluations}
                    onBack={handleBackToSummary}
                    serviceMenus={serviceMenus}
                />
            )}
        </div>
    );
};

export default GestionNotasView;