
import React, { useState, useEffect } from 'react';
// FIX: Module '"./components/Sidebar"' has no default export. Using a named import instead.
import { Sidebar } from './components/Sidebar';
import AlumnosView from './components/AlumnosView';
import Login from './components/Login';
import { Student, NavItemType, EvaluationsState, StudentPracticalExam, TheoreticalExamGrades, CourseGrades } from './types';
import { INITIAL_STUDENTS } from './constants';
import GestionPracticaView from './components/GestionPracticaView';
import CocinaView from './components/CocinaView';
import GestionAppView from './components/GestionAppView';
import GestionNotasView from './components/GestionNotasView';
import ExamenesPracticosView from './components/ExamenesPracticosView';
import GestionAcademicaView from './components/GestionAcademicaView';
import DashboardView from './components/DashboardView';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<NavItemType>('Dashboard');
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const savedStudents = localStorage.getItem('teacher-dashboard-students');
      return savedStudents ? JSON.parse(savedStudents) : INITIAL_STUDENTS;
    } catch (error) {
      console.error("Could not parse students from localStorage", error);
      return INITIAL_STUDENTS;
    }
  });

  const [evaluations, setEvaluations] = useState<EvaluationsState>(() => {
    try {
      const saved = localStorage.getItem('teacher-dashboard-evaluations');
      return saved ? JSON.parse(saved) : { group: [], individual: [] };
    } catch (error) {
      console.error("Could not parse evaluations from localStorage", error);
      return { group: [], individual: [] };
    }
  });

  const [practicalExams, setPracticalExams] = useState<StudentPracticalExam[]>(() => {
    try {
      const saved = localStorage.getItem('teacher-dashboard-practical-exams');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Could not parse practical exams from localStorage", error);
      return [];
    }
  });

  const [academicGrades, setAcademicGrades] = useState<{[nre: string]: TheoreticalExamGrades}>(() => {
    try {
      const saved = localStorage.getItem('teacher-dashboard-academic-grades');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Could not parse academic grades from localStorage", error);
      return {};
    }
  });

  const [courseGrades, setCourseGrades] = useState<{[nre: string]: CourseGrades}>(() => {
    try {
      const saved = localStorage.getItem('teacher-dashboard-course-grades');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Could not parse course grades from localStorage", error);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('teacher-dashboard-students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('teacher-dashboard-evaluations', JSON.stringify(evaluations));
  }, [evaluations]);

  useEffect(() => {
    localStorage.setItem('teacher-dashboard-practical-exams', JSON.stringify(practicalExams));
  }, [practicalExams]);

  useEffect(() => {
    localStorage.setItem('teacher-dashboard-academic-grades', JSON.stringify(academicGrades));
  }, [academicGrades]);
  
  useEffect(() => {
    localStorage.setItem('teacher-dashboard-course-grades', JSON.stringify(courseGrades));
  }, [courseGrades]);


  const renderView = () => {
    switch (activeView) {
      case 'Dashboard':
        return <DashboardView students={students} evaluations={evaluations} setActiveView={setActiveView} />;
      case 'Alumnos':
        return <AlumnosView 
                  students={students} 
                  setStudents={setStudents} 
                  evaluations={evaluations} 
                  practicalExams={practicalExams}
                  academicGrades={academicGrades}
                  courseGrades={courseGrades}
                />;
      case 'Gestión Práctica':
        return <GestionPracticaView students={students} />;
      case 'Cocina':
        return <CocinaView />;
      case 'Gestión de la App':
        return <GestionAppView />;
      case 'Gestión de Notas':
        return <GestionNotasView 
                  students={students} 
                  setStudents={setStudents}
                  evaluations={evaluations} 
                  setEvaluations={setEvaluations} 
               />;
      case 'Exámenes Prácticos':
        return <ExamenesPracticosView 
                  students={students}
                  exams={practicalExams}
                  setExams={setPracticalExams}
                />;
      case 'Gestión Académica':
        return <GestionAcademicaView
                  students={students}
                  evaluations={evaluations}
                  practicalExams={practicalExams}
                  academicGrades={academicGrades}
                  setAcademicGrades={setAcademicGrades}
                  courseGrades={courseGrades}
                  setCourseGrades={setCourseGrades}
                />;
      default:
        return <DashboardView students={students} evaluations={evaluations} setActiveView={setActiveView} />;
    }
  };
  
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
