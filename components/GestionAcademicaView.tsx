import React, { useState, useMemo, useEffect } from 'react';
import { Student, EvaluationsState, StudentPracticalExam, TheoreticalExamGrades, Service, StudentGroupAssignments, EvaluationItemScore, CourseGrades, CourseModuleGrades } from '../types';
import { ACADEMIC_EVALUATION_STRUCTURE, COURSE_MODULES } from '../constants';
import { CheckIcon, DownloadIcon } from './icons';
import { downloadPdfWithTables } from './printUtils';

interface GestionAcademicaViewProps {
  students: Student[];
  evaluations: EvaluationsState;
  practicalExams: StudentPracticalExam[];
  academicGrades: {[nre: string]: TheoreticalExamGrades};
  setAcademicGrades: React.Dispatch<React.SetStateAction<{[nre: string]: TheoreticalExamGrades}>>;
  courseGrades: { [nre: string]: CourseGrades };
  setCourseGrades: React.Dispatch<React.SetStateAction<{ [nre: string]: CourseGrades }>>;
}

// Helper functions
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

const getGradeColor = (score: number | undefined | null) => {
    if (score === undefined || score === null) return '';
    if (score >= 9) return 'text-green-700';
    if (score >= 7) return 'text-blue-700';
    if (score >= 5) return 'text-yellow-700';
    return 'text-red-700';
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

// --- TAB COMPONENT: MODULO PRINCIPAL ---
interface ModuloPrincipalTabProps extends Omit<GestionAcademicaViewProps, 'courseGrades' | 'setCourseGrades' | 'setAcademicGrades'> {
    academicGrades: { [nre: string]: TheoreticalExamGrades };
    handleGradeChange: (studentNre: string, instrumentKey: keyof TheoreticalExamGrades, value: string) => void;
}

const ModuloPrincipalTab: React.FC<ModuloPrincipalTabProps> = ({
    students, evaluations, practicalExams, academicGrades, handleGradeChange
}) => {
    const services = useMemo(() => safeJsonParse<Service[]>('practicaServices', []), []);
    const studentGroupAssignments = useMemo(() => safeJsonParse<StudentGroupAssignments>('studentGroupAssignments', {}), []);

    const calculatedGradesByStudent = useMemo(() => {
        const result: { [nre: string]: { [key: string]: number | null } } = {};
        students.forEach(student => {
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
            result[student.nre] = grades;
        });
        return result;
    }, [students, services, evaluations, practicalExams, studentGroupAssignments]);

    const studentsByGroup = useMemo(() => {
        const grouped: { [key: string]: Student[] } = {};
        students.forEach(s => {
            const groupName = s.grupo || 'Sin Grupo';
            if (!grouped[groupName]) grouped[groupName] = [];
            grouped[groupName].push(s);
        });
        for (const groupName in grouped) {
            grouped[groupName].sort((a, b) => 
                `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`)
            );
        }
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [students]);

    const handleExportPdfPrincipal = () => {
        const head = [
            [{ content: 'Alumno', rowSpan: 2 }, 
             { content: '1º Trimestre', colSpan: 5 }, 
             { content: '2º Trimestre', colSpan: 5 }, 
             { content: 'Recuperación', colSpan: 3 }],
            [
                'Ex1(10%)', 'Ex2(10%)', 'Serv(15%)', 'Prac(15%)', 'Media T1',
                'Ex3(10%)', 'Ex4(10%)', 'Serv(15%)', 'Prac(15%)', 'Media T2',
                'Teo(50%)', 'Prac(50%)', 'Media REC'
            ]
        ];
    
        const body: any[][] = [];
        studentsByGroup.forEach(([groupName, groupStudents]) => {
            body.push([{ content: groupName, colSpan: 14, styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }]);
            groupStudents.forEach(student => {
                const row: (string | { content: string, styles: any })[] = [];
                row.push(`${student.apellido1} ${student.apellido2}, ${student.nombre}`);
                
                const calculatedGrades = calculatedGradesByStudent[student.nre] || {};
                const theoreticalGrades = academicGrades[student.nre] || {};
                
                let t1_weighted = 0, t1_weight = 0;
                let t2_weighted = 0, t2_weight = 0;
                let rec_weighted = 0, rec_weight = 0;
    
                ACADEMIC_EVALUATION_STRUCTURE.trimestres[0].instruments.forEach(inst => {
                    const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
                    row.push(grade?.toFixed(2) ?? 'N/A');
                    if (grade !== null && grade !== undefined) {
                        t1_weighted += grade * inst.weight;
                        t1_weight += inst.weight;
                    }
                });
                const t1_avg = t1_weight > 0 ? t1_weighted / t1_weight : 0;
                row.push({ content: t1_avg.toFixed(2), styles: { fontStyle: 'bold' } });
    
                ACADEMIC_EVALUATION_STRUCTURE.trimestres[1].instruments.forEach(inst => {
                    const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
                    row.push(grade?.toFixed(2) ?? 'N/A');
                     if (grade !== null && grade !== undefined) {
                        t2_weighted += grade * inst.weight;
                        t2_weight += inst.weight;
                    }
                });
                const t2_avg = t2_weight > 0 ? t2_weighted / t2_weight : 0;
                row.push({ content: t2_avg.toFixed(2), styles: { fontStyle: 'bold' } });
    
                ACADEMIC_EVALUATION_STRUCTURE.recuperacion.instruments.forEach(inst => {
                    const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
                     row.push(grade?.toFixed(2) ?? 'N/A');
                     if (grade !== null && grade !== undefined) {
                        rec_weighted += grade * inst.weight;
                        rec_weight += inst.weight;
                    }
                });
                const rec_avg = rec_weight > 0 ? rec_weighted / rec_weight : 0;
                row.push({ content: rec_avg.toFixed(2), styles: { fontStyle: 'bold' } });
    
                body.push(row);
            });
        });
    
        downloadPdfWithTables(
            'Gestión Académica - Módulo Principal',
            'gestion_academica_principal',
            [{ head, body }],
            { orientation: 'landscape' }
        );
    };

    return (
        <div className="mt-6">
            <div className="flex justify-end mb-4">
                <button onClick={handleExportPdfPrincipal} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <DownloadIcon className="h-5 w-5"/> Exportar PDF
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh]">
                    <table className="min-w-full divide-y divide-gray-200 border-separate" style={{borderSpacing: 0}}>
                        <thead className="bg-gray-50 sticky top-0 z-20">
                        <tr>
                            <th rowSpan={2} className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-30 border-b border-r">Alumno</th>
                            {ACADEMIC_EVALUATION_STRUCTURE.trimestres.map(trimestre => (
                                <th key={trimestre.name} colSpan={trimestre.instruments.length + 1} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">
                                    {trimestre.name}
                                </th>
                            ))}
                             <th colSpan={ACADEMIC_EVALUATION_STRUCTURE.recuperacion.instruments.length + 1} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">
                                {ACADEMIC_EVALUATION_STRUCTURE.recuperacion.name}
                            </th>
                        </tr>
                        <tr>
                             {ACADEMIC_EVALUATION_STRUCTURE.trimestres.map(trimestre => (
                                <React.Fragment key={`${trimestre.name}-cols`}>
                                    {trimestre.instruments.map(inst => (
                                        <th key={inst.key} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r whitespace-nowrap">
                                            {inst.name} <span className="font-normal">({(inst.weight * 50).toFixed(0)}%)</span>
                                        </th>
                                    ))}
                                    <th className="px-2 py-2 text-center text-xs font-bold text-teal-600 uppercase tracking-wider border-b border-r bg-teal-50 whitespace-nowrap">Media</th>
                                </React.Fragment>
                            ))}
                            {ACADEMIC_EVALUATION_STRUCTURE.recuperacion.instruments.map(inst => (
                                <th key={inst.key} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r whitespace-nowrap">
                                    {inst.name} <span className="font-normal">({(inst.weight * 100).toFixed(0)}%)</span>
                                </th>
                            ))}
                            <th className="px-2 py-2 text-center text-xs font-bold text-teal-600 uppercase tracking-wider border-b border-r bg-teal-50 whitespace-nowrap">Media REC</th>
                        </tr>
                    </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                         {studentsByGroup.map(([groupName, groupStudents]) => (
                            <React.Fragment key={groupName}>
                                <tr>
                                    <td colSpan={14} className="sticky left-0 px-4 py-2 bg-gray-100 text-sm font-bold text-gray-700 z-10">{groupName}</td>
                                </tr>
                                {groupStudents.map((student) => {
                                    const calculatedGrades = calculatedGradesByStudent[student.nre] || {};
                                    const theoreticalGrades = academicGrades[student.nre] || {};

                                    return (
                                    <tr key={student.nre} className="hover:bg-gray-50">
                                        <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 z-10 border-r">{student.apellido1} {student.apellido2}, {student.nombre}</td>
                                        {ACADEMIC_EVALUATION_STRUCTURE.trimestres.map(trimestre => {
                                            let weightedTotal = 0;
                                            let totalWeight = 0;
                                            const cells = trimestre.instruments.map(inst => {
                                                const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
                                                if (typeof grade === 'number' && !isNaN(grade)) {
                                                    weightedTotal += grade * inst.weight;
                                                    totalWeight += inst.weight;
                                                }
                                                return (
                                                    <td key={inst.key} className="px-2 py-2 text-center text-sm border-r">
                                                        {inst.type === 'manual' ? (
                                                            <input 
                                                                type="number"
                                                                defaultValue={grade ?? ''}
                                                                onBlur={(e) => handleGradeChange(student.nre, inst.key as keyof TheoreticalExamGrades, e.target.value)}
                                                                min="0" max="10" step="0.01"
                                                                className={`w-20 p-1 border rounded-md text-center bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500 ${grade !== undefined ? getGradeColor(grade) : ''}`}
                                                            />
                                                        ) : (
                                                            <span className={`font-semibold ${grade !== null && grade !== undefined ? getGradeColor(grade) : 'text-gray-400'}`}>
                                                                {grade !== null && grade !== undefined ? grade.toFixed(2) : 'N/A'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            });

                                            const trimestreAverage = totalWeight > 0 ? weightedTotal / totalWeight : 0;
                                            cells.push(
                                                <td key={`${trimestre.name}-avg`} className={`px-2 py-2 text-center text-sm font-bold border-r bg-teal-50 ${getGradeColor(trimestreAverage)}`}>
                                                    {trimestreAverage.toFixed(2)}
                                                </td>
                                            );
                                            return cells;
                                        })}

                                        {(() => {
                                            let weightedTotalRec = 0;
                                            let totalWeightRec = 0;
                                            const recCells = ACADEMIC_EVALUATION_STRUCTURE.recuperacion.instruments.map(inst => {
                                                const grade = inst.type === 'manual' ? theoreticalGrades[inst.key as keyof TheoreticalExamGrades] : calculatedGrades[inst.key];
                                                if (typeof grade === 'number' && !isNaN(grade)) {
                                                    weightedTotalRec += grade * inst.weight;
                                                    totalWeightRec += inst.weight;
                                                }
                                                return (
                                                    <td key={inst.key} className="px-2 py-2 text-center text-sm border-r">
                                                        {inst.type === 'manual' ? (
                                                            <input 
                                                                type="number"
                                                                defaultValue={grade ?? ''}
                                                                onBlur={(e) => handleGradeChange(student.nre, inst.key as keyof TheoreticalExamGrades, e.target.value)}
                                                                min="0" max="10" step="0.01"
                                                                className={`w-20 p-1 border rounded-md text-center bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500 ${grade !== undefined ? getGradeColor(grade) : ''}`}
                                                            />
                                                        ) : (
                                                            <span className={`font-semibold ${grade !== null && grade !== undefined ? getGradeColor(grade) : 'text-gray-400'}`}>
                                                                {grade !== null && grade !== undefined ? grade.toFixed(2) : 'N/A'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            });
                                            const recAverage = totalWeightRec > 0 ? weightedTotalRec / totalWeightRec : 0;
                                            recCells.push(
                                                <td key="rec-avg" className={`px-2 py-2 text-center text-sm font-bold border-r bg-teal-50 ${getGradeColor(recAverage)}`}>
                                                    {recAverage.toFixed(2)}
                                                </td>
                                            );
                                            return recCells;
                                        })()}
                                    </tr>
                                    );
                                })}
                            </React.Fragment>
                         ))}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- TAB COMPONENT: OTROS MODULOS ---
interface OtrosModulosTabProps extends Pick<GestionAcademicaViewProps, 'students'> {
    courseGrades: { [nre: string]: CourseGrades };
    handleGradeChange: (studentNre: string, moduleKey: string, period: keyof CourseModuleGrades, value: string) => void;
}
const OtrosModulosTab: React.FC<OtrosModulosTabProps> = ({
    students, courseGrades, handleGradeChange
}) => {
    
    const studentsByGroup = useMemo(() => {
        const grouped: { [key: string]: Student[] } = {};
        students.forEach(s => {
          const groupName = s.grupo || 'Sin Grupo';
          if (!grouped[groupName]) grouped[groupName] = [];
          grouped[groupName].push(s);
        });
        for (const groupName in grouped) {
          grouped[groupName].sort((a, b) =>
            `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`)
          );
        }
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [students]);

    const handleExportPdfOtros = () => {
        const headRow1: any[] = [{ content: 'Alumno', rowSpan: 2 }];
        const headRow2: any[] = [];
        
        COURSE_MODULES.forEach(module => {
            headRow1.push({ content: module.name, colSpan: module.trimesters === 3 ? 5 : 4 });
            headRow2.push('T1', 'T2');
            if (module.trimesters === 3) headRow2.push('T3');
            headRow2.push('REC');
            headRow2.push({ content: 'Final', styles: { fontStyle: 'bold' } });
        });
    
        const head = [headRow1, headRow2];
        
        const body: any[][] = [];
        studentsByGroup.forEach(([groupName, groupStudents]) => {
            body.push([{ content: groupName, colSpan: headRow1.reduce((acc, cell) => acc + (cell.colSpan || 1), 0), styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }]);
            groupStudents.forEach(student => {
                const rowData: (string | { content: string, styles: any })[] = [];
                rowData.push(`${student.apellido1} ${student.apellido2}, ${student.nombre}`);
    
                const studentGrades = courseGrades[student.nre];
    
                COURSE_MODULES.forEach(module => {
                    const moduleGrades = studentGrades?.[module.key];
                    const finalGrade = calculateFinalGrade(moduleGrades, module.trimesters);
                    
                    rowData.push(moduleGrades?.t1?.toFixed(2) ?? '-');
                    rowData.push(moduleGrades?.t2?.toFixed(2) ?? '-');
                    if (module.trimesters === 3) {
                        rowData.push(moduleGrades?.t3?.toFixed(2) ?? '-');
                    }
                    rowData.push(moduleGrades?.rec?.toFixed(2) ?? '-');
                    rowData.push({ content: finalGrade !== null ? finalGrade.toFixed(2) : '-', styles: { fontStyle: 'bold' } });
                });
                body.push(rowData);
            });
        });
    
        downloadPdfWithTables(
            'Gestión Académica - Otros Módulos',
            'gestion_academica_otros',
            [{ head, body }],
            { orientation: 'landscape' }
        );
    };

    return (
        <div className="mt-6">
            <div className="flex justify-end mb-4">
                <button onClick={handleExportPdfOtros} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <DownloadIcon className="h-5 w-5"/> Exportar PDF
                </button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh]">
                    <table className="min-w-full divide-y divide-gray-200 border-separate" style={{borderSpacing: 0}}>
                        <thead className="bg-gray-100 sticky top-0 z-20">
                            <tr>
                                <th rowSpan={2} className="sticky left-0 bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 z-30 border-b border-r">Alumno</th>
                                {COURSE_MODULES.map(module => (
                                    <th key={module.key} colSpan={module.trimesters === 3 ? 5 : 4} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">
                                        {module.name}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                {COURSE_MODULES.map(module => (
                                    <React.Fragment key={`${module.key}-periods`}>
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r bg-gray-50">T1</th>
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r bg-gray-50">T2</th>
                                        {module.trimesters === 3 && <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r bg-gray-50">T3</th>}
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r bg-gray-50">REC</th>
                                        <th className="px-2 py-2 text-center text-xs font-bold text-teal-600 uppercase tracking-wider border-b border-r bg-teal-50">Final</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {studentsByGroup.map(([groupName, groupStudents]) => (
                                <React.Fragment key={groupName}>
                                    <tr>
                                        <td colSpan={COURSE_MODULES.reduce((acc, mod) => acc + (mod.trimesters === 3 ? 5 : 4), 1)} className="sticky left-0 px-4 py-2 bg-gray-200 text-sm font-bold text-gray-800 z-10">{groupName}</td>
                                    </tr>
                                    {groupStudents.map(student => {
                                        const studentGrades = courseGrades[student.nre];
                                        return (
                                            <tr key={student.nre} className="hover:bg-gray-50">
                                                <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 z-10 border-r">
                                                    {student.apellido1} {student.apellido2}, {student.nombre}
                                                </td>
                                                {COURSE_MODULES.map(module => {
                                                    const moduleGrades = studentGrades?.[module.key];
                                                    const finalGrade = calculateFinalGrade(moduleGrades, module.trimesters);
                                                    return (
                                                        <React.Fragment key={module.key}>
                                                            <td className="px-2 py-1 text-center text-sm border-r">
                                                                <input type="number" defaultValue={moduleGrades?.t1 ?? ''} onBlur={(e) => handleGradeChange(student.nre, module.key, 't1', e.target.value)} min="0" max="10" step="0.1" className={`w-20 p-1 border rounded-md text-center bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500 ${getGradeColor(moduleGrades?.t1)}`} />
                                                            </td>
                                                            <td className="px-2 py-1 text-center text-sm border-r">
                                                                <input type="number" defaultValue={moduleGrades?.t2 ?? ''} onBlur={(e) => handleGradeChange(student.nre, module.key, 't2', e.target.value)} min="0" max="10" step="0.1" className={`w-20 p-1 border rounded-md text-center bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500 ${getGradeColor(moduleGrades?.t2)}`} />
                                                            </td>
                                                            {module.trimesters === 3 && (
                                                                <td className="px-2 py-1 text-center text-sm border-r">
                                                                    <input type="number" defaultValue={moduleGrades?.t3 ?? ''} onBlur={(e) => handleGradeChange(student.nre, module.key, 't3', e.target.value)} min="0" max="10" step="0.1" className={`w-20 p-1 border rounded-md text-center bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500 ${getGradeColor(moduleGrades?.t3)}`} />
                                                                </td>
                                                            )}
                                                            <td className="px-2 py-1 text-center text-sm border-r">
                                                                <input type="number" defaultValue={moduleGrades?.rec ?? ''} onBlur={(e) => handleGradeChange(student.nre, module.key, 'rec', e.target.value)} min="0" max="10" step="0.1" className={`w-20 p-1 border rounded-md text-center bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500 ${getGradeColor(moduleGrades?.rec)}`} />
                                                            </td>
                                                            <td className="px-2 py-1 text-center text-sm border-r bg-teal-50 font-bold">
                                                                <span className={getGradeColor(finalGrade)}>
                                                                    {finalGrade !== null ? finalGrade.toFixed(2) : '-'}
                                                                </span>
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- MAIN VIEW COMPONENT ---
const GestionAcademicaView: React.FC<GestionAcademicaViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'principal' | 'otros'>('principal');

    const [localAcademicGrades, setLocalAcademicGrades] = useState(props.academicGrades);
    const [localCourseGrades, setLocalCourseGrades] = useState(props.courseGrades);

    const [isDirty, setIsDirty] = useState(false);
    type SaveStatus = 'idle' | 'saving' | 'saved';
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    useEffect(() => { setLocalAcademicGrades(props.academicGrades); }, [props.academicGrades]);
    useEffect(() => { setLocalCourseGrades(props.courseGrades); }, [props.courseGrades]);

    const handlePrincipalGradeChange = (studentNre: string, instrumentKey: keyof TheoreticalExamGrades, value: string) => {
        const newGrade = value === '' ? undefined : parseFloat(value);
        if (newGrade !== undefined && (isNaN(newGrade) || newGrade < 0 || newGrade > 10)) return;

        setLocalAcademicGrades(prev => {
            const studentGrades = { ...(prev[studentNre] || {}) };
            if (newGrade === undefined) {
                delete studentGrades[instrumentKey];
            } else {
                studentGrades[instrumentKey] = newGrade;
            }
            return { ...prev, [studentNre]: studentGrades };
        });
        setIsDirty(true);
        setSaveStatus('idle');
    };

    const handleOtrosGradeChange = (studentNre: string, moduleKey: string, period: keyof CourseModuleGrades, value: string) => {
        const newGrade = value === '' ? undefined : parseFloat(value);
        if (newGrade !== undefined && (isNaN(newGrade) || newGrade < 0 || newGrade > 10)) return;

        setLocalCourseGrades(prev => {
            const studentGrades = { ...(prev[studentNre] || {}) };
            const moduleGrades = { ...(studentGrades[moduleKey] || {}) };
            
            if (newGrade === undefined) {
                delete moduleGrades[period];
            } else {
                moduleGrades[period] = newGrade;
            }

            const newStudentGrades = { ...studentGrades, [moduleKey]: moduleGrades };
            if (Object.keys(moduleGrades).length === 0) delete newStudentGrades[moduleKey];

            const newCourseGrades = { ...prev, [studentNre]: newStudentGrades };
            if (Object.keys(newStudentGrades).length === 0) delete newCourseGrades[studentNre];

            return newCourseGrades;
        });
        setIsDirty(true);
        setSaveStatus('idle');
    };

    const handleSaveChanges = () => {
        setSaveStatus('saving');
        props.setAcademicGrades(localAcademicGrades);
        props.setCourseGrades(localCourseGrades);
        setIsDirty(false);

        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        }, 500);
    };
    
    return (
        <div className="p-8">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestión Académica</h1>
                    <p className="mt-2 text-gray-600">
                        Vista centralizada para gestionar las notas del curso.
                    </p>
                </div>
                 <div className="flex items-center gap-4">
                    {saveStatus === 'saved' && (
                        <div className="flex items-center gap-2 text-green-600 font-semibold bg-green-100 py-2 px-4 rounded-lg">
                           <CheckIcon className="h-5 w-5"/>
                           ¡Guardado!
                        </div>
                    )}
                    <button
                        onClick={handleSaveChanges}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className="bg-teal-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {saveStatus === 'saving' ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </header>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('principal')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'principal'
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Módulo Principal
                    </button>
                    <button
                        onClick={() => setActiveTab('otros')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'otros'
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Otros Módulos
                    </button>
                </nav>
            </div>
            
            <div>
                {activeTab === 'principal' && (
                    <ModuloPrincipalTab 
                        {...props} 
                        academicGrades={localAcademicGrades} 
                        handleGradeChange={handlePrincipalGradeChange}
                    />
                )}
                {activeTab === 'otros' && (
                    <OtrosModulosTab 
                        students={props.students}
                        courseGrades={localCourseGrades}
                        handleGradeChange={handleOtrosGradeChange}
                    />
                )}
            </div>
        </div>
    );
};

export default GestionAcademicaView;
