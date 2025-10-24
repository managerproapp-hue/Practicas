import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TeacherData, InstituteData } from '../types';
import { UploadIcon, DownloadIcon, TrashIcon, CheckIcon } from './icons';

interface AccordionItemProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const BACKUP_MODULES = [
    // Student Data
    { key: 'teacher-dashboard-students', label: 'Fichas de Alumnos' },

    // Grades & Evaluations
    { key: 'teacher-dashboard-evaluations', label: 'Evaluaciones de Servicios (Notas)' },
    { key: 'teacher-dashboard-practical-exams', label: 'Exámenes Prácticos' },
    { key: 'teacher-dashboard-academic-grades', label: 'Gestión Académica (Módulo Principal)' },
    { key: 'teacher-dashboard-course-grades', label: 'Gestión Académica (Otros Módulos)' },

    // Practical Management
    { key: 'practicaGroups', label: 'Grupos de Prácticas' },
    { key: 'studentGroupAssignments', label: 'Asignación de Alumnos a Grupos' },
    { key: 'groupColors', label: 'Colores de Grupos' },
    { key: 'practicaServices', label: 'Servicios de Prácticas' },
    { key: 'planningAssignments', label: 'Planning de Servicios' },
    
    // App Settings
    { key: 'teacher-app-data', label: 'Datos del Profesor' },
    { key: 'institute-app-data', label: 'Datos del Instituto' }
];


const AccordionItem: React.FC<AccordionItemProps> = ({ title, isOpen, onToggle, disabled = false, children }) => (
  <div className={`border rounded-lg ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
    <h2>
      <button
        type="button"
        className={`flex items-center justify-between w-full p-5 font-medium text-left text-gray-500 rounded-lg ${!disabled && 'hover:bg-gray-100'} ${isOpen && !disabled ? 'bg-gray-100' : ''}`}
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={isOpen}
      >
        <span className={`text-lg ${disabled ? 'text-gray-400' : 'text-gray-800'}`}>{title}</span>
        {!disabled && (
          <svg className={`w-6 h-6 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        )}
      </button>
    </h2>
    <div className={`${isOpen ? 'block' : 'hidden'} border-t`}>
      <div className="p-5">
        {children}
      </div>
    </div>
  </div>
);

const GestionAppView: React.FC = () => {
    const [openAccordion, setOpenAccordion] = useState<string | null>('teacher');
    
    const [teacherData, setTeacherData] = useState<TeacherData>({ name: '', email: '', logo: null });
    const [instituteData, setInstituteData] = useState<InstituteData>({ name: '', address: '', cif: '', logo: null });
    
    const [backupSelection, setBackupSelection] = useState<Record<string, boolean>>(() =>
        BACKUP_MODULES.reduce((acc, mod) => ({ ...acc, [mod.key]: true }), {})
    );

    type RestoreStage = 'idle' | 'uploading' | 'restoring' | 'success' | 'error';
    const [restoreStatus, setRestoreStatus] = useState<{stage: RestoreStage, progress: number, message: string}>({
        stage: 'idle',
        progress: 0,
        message: ''
    });

    const teacherLogoInputRef = useRef<HTMLInputElement>(null);
    const instituteLogoInputRef = useRef<HTMLInputElement>(null);
    const backupInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedTeacherData = localStorage.getItem('teacher-app-data');
        if (savedTeacherData) setTeacherData(JSON.parse(savedTeacherData));
        
        const savedInstituteData = localStorage.getItem('institute-app-data');
        if (savedInstituteData) setInstituteData(JSON.parse(savedInstituteData));
    }, []);

    const handleAccordionToggle = (id: string) => {
        setOpenAccordion(prev => (prev === id ? null : id));
    };
    
    const handleSaveTeacherData = () => {
        localStorage.setItem('teacher-app-data', JSON.stringify(teacherData));
        alert('Datos del profesor guardados con éxito.');
    };
    
    const handleSaveInstituteData = () => {
        localStorage.setItem('institute-app-data', JSON.stringify(instituteData));
        alert('Datos del instituto guardados con éxito.');
    };

    const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, setData: React.Dispatch<React.SetStateAction<any>>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert("Formato de archivo no válido. Por favor, sube un archivo PNG o JPG.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert("El archivo es demasiado grande. El tamaño máximo permitido es 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setData((prev: any) => ({ ...prev, logo: event.target?.result as string }));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleBackupSelectionChange = (key: string) => {
        setBackupSelection(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectAll = () => {
        setBackupSelection(BACKUP_MODULES.reduce((acc, mod) => ({ ...acc, [mod.key]: true }), {}));
    };
    
    const handleDeselectAll = () => {
        setBackupSelection(BACKUP_MODULES.reduce((acc, mod) => ({ ...acc, [mod.key]: false }), {}));
    };


    const handleDownloadBackup = () => {
        const backupData: { [key: string]: any } = {};
        const keysToBackup = Object.keys(backupSelection).filter(key => backupSelection[key]);
        
        if (keysToBackup.length === 0) {
            alert("Por favor, selecciona al menos un módulo de datos para descargar.");
            return;
        }

        keysToBackup.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    backupData[key] = JSON.parse(data);
                } catch(e) {
                    console.warn(`Could not parse data for key ${key} during backup. Skipping.`);
                }
            }
        });
        
        const date = new Date().toISOString().split('T')[0];
        const fileName = `teacherdash_backup_${date}.json`;
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                setRestoreStatus({ stage: 'uploading', progress: 10, message: 'Leyendo archivo...' });
                await sleep(500);

                const backupData = JSON.parse(event.target?.result as string);
                
                if (typeof backupData !== 'object' || backupData === null) {
                    throw new Error("El archivo no contiene un objeto JSON válido.");
                }

                setRestoreStatus({ stage: 'uploading', progress: 25, message: 'Archivo verificado.' });
                await sleep(500);
                
                if (!window.confirm("¿Estás seguro de que quieres restaurar desde este archivo? Se sobrescribirán todos los datos actuales de la aplicación.")) {
                    setRestoreStatus({ stage: 'idle', progress: 0, message: '' });
                    if (backupInputRef.current) backupInputRef.current.value = "";
                    return;
                }

                setRestoreStatus({ stage: 'restoring', progress: 30, message: 'Iniciando implantación...' });
                await sleep(500);

                const keysToRestore = Object.keys(backupData);
                const totalKeys = keysToRestore.length;

                for (let i = 0; i < totalKeys; i++) {
                    const key = keysToRestore[i];
                    localStorage.setItem(key, JSON.stringify(backupData[key]));
                    
                    const progress = 30 + Math.round(((i + 1) / totalKeys) * 65);
                    setRestoreStatus({ 
                        stage: 'restoring', 
                        progress: progress, 
                        message: `Implantando: ${key}` 
                    });
                    await sleep(150);
                }

                setRestoreStatus({ stage: 'success', progress: 100, message: '¡Restauración completada! La aplicación se recargará.' });
                await sleep(2000);
                window.location.reload();

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "No es un backup válido.";
                setRestoreStatus({ stage: 'error', progress: 0, message: `Error al procesar el archivo: ${errorMessage}` });
            } finally {
                if (backupInputRef.current) backupInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de la Aplicación</h1>
                <p className="mt-2 text-gray-600">Configura los datos del profesor, del instituto y gestiona las copias de seguridad.</p>
            </header>

            <div className="space-y-4">
                <AccordionItem title="Datos del Profesor" isOpen={openAccordion === 'teacher'} onToggle={() => handleAccordionToggle('teacher')}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                                <input type="text" value={teacherData.name} onChange={e => setTeacherData({...teacherData, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Email de Contacto</label>
                                <input type="email" value={teacherData.email} onChange={e => setTeacherData({...teacherData, email: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Logo del Profesor</label>
                             <div className="mt-1 w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                                {teacherData.logo ? (
                                    <img src={teacherData.logo} alt="Logo Profesor" className="max-h-full max-w-full object-contain"/>
                                ) : <span className="text-gray-400">Sin logo</span>}
                             </div>
                             <div className="flex gap-2 mt-2">
                                <button onClick={() => teacherLogoInputRef.current?.click()} className="flex-1 text-sm bg-gray-200 py-1.5 px-3 rounded-md hover:bg-gray-300">Cambiar</button>
                                <button onClick={() => setTeacherData({...teacherData, logo: null})} className="text-red-500 p-1.5 rounded-md hover:bg-red-50"><TrashIcon className="h-5 w-5"/></button>
                                <input type="file" ref={teacherLogoInputRef} onChange={(e) => handleLogoUpload(e, setTeacherData)} accept=".png,.jpg,.jpeg" className="hidden"/>
                             </div>
                        </div>
                    </div>
                     <div className="text-right mt-6">
                        <button onClick={handleSaveTeacherData} className="bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 flex items-center gap-2 ml-auto">
                           <CheckIcon className="h-5 w-5"/> Guardar Datos del Profesor
                        </button>
                    </div>
                </AccordionItem>
                
                <AccordionItem title="Instituto" isOpen={openAccordion === 'institute'} onToggle={() => handleAccordionToggle('institute')}>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre del Instituto</label>
                                <input type="text" value={instituteData.name} onChange={e => setInstituteData({...instituteData, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                <input type="text" value={instituteData.address} onChange={e => setInstituteData({...instituteData, address: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">CIF</label>
                                <input type="text" value={instituteData.cif} onChange={e => setInstituteData({...instituteData, cif: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Logo del Instituto</label>
                             <div className="mt-1 w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                                {instituteData.logo ? (
                                    <img src={instituteData.logo} alt="Logo Instituto" className="max-h-full max-w-full object-contain"/>
                                ) : <span className="text-gray-400">Sin logo</span>}
                             </div>
                             <div className="flex gap-2 mt-2">
                                <button onClick={() => instituteLogoInputRef.current?.click()} className="flex-1 text-sm bg-gray-200 py-1.5 px-3 rounded-md hover:bg-gray-300">Cambiar</button>
                                <button onClick={() => setInstituteData({...instituteData, logo: null})} className="text-red-500 p-1.5 rounded-md hover:bg-red-50"><TrashIcon className="h-5 w-5"/></button>
                                <input type="file" ref={instituteLogoInputRef} onChange={(e) => handleLogoUpload(e, setInstituteData)} accept=".png,.jpg,.jpeg" className="hidden"/>
                             </div>
                        </div>
                    </div>
                     <div className="text-right mt-6">
                        <button onClick={handleSaveInstituteData} className="bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 flex items-center gap-2 ml-auto">
                           <CheckIcon className="h-5 w-5"/> Guardar Datos del Instituto
                        </button>
                    </div>
                </AccordionItem>
                
                <AccordionItem title="Backup y Restauración" isOpen={openAccordion === 'backup'} onToggle={() => handleAccordionToggle('backup')}>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-bold text-lg mb-2">Crear Copia de Seguridad</h4>
                            <p className="text-sm text-gray-600 mb-4">Selecciona los módulos de datos que quieres incluir en el archivo de backup.</p>
                            
                            <div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md bg-white mb-3">
                                {BACKUP_MODULES.map(module => (
                                    <label key={module.key} className="flex items-center text-sm">
                                        <input
                                            type="checkbox"
                                            checked={backupSelection[module.key] || false}
                                            onChange={() => handleBackupSelectionChange(module.key)}
                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="ml-2 text-gray-700">{module.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-2 mb-4">
                                <button onClick={handleSelectAll} className="text-xs font-semibold text-blue-600 hover:underline">Seleccionar todo</button>
                                <button onClick={handleDeselectAll} className="text-xs font-semibold text-blue-600 hover:underline">Deseleccionar todo</button>
                            </div>
                            
                            <button onClick={handleDownloadBackup} className="w-full flex items-center justify-center gap-2 p-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-semibold">
                                <DownloadIcon className="h-5 w-5"/> Descargar Backup
                            </button>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-bold text-lg mb-2">Restaurar Copia de Seguridad</h4>
                            <p className="text-sm text-gray-600 mb-4">
                                Selecciona un archivo de backup. <strong className="text-red-600">Cuidado:</strong> Esto sobreescribirá todos los datos actuales.
                            </p>
                            
                            {restoreStatus.stage === 'idle' && (
                                <button onClick={() => backupInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold">
                                    <UploadIcon className="h-5 w-5"/> Subir y Restaurar
                                </button>
                            )}

                            {(restoreStatus.stage === 'uploading' || restoreStatus.stage === 'restoring') && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                    <p className="font-semibold text-blue-800 text-center mb-2">Restaurando...</p>
                                    <div className="w-full bg-gray-200 rounded-full h-4">
                                        <div className="bg-blue-600 h-4 rounded-full transition-all duration-300" style={{ width: `${restoreStatus.progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-blue-700 truncate pr-2">{restoreStatus.message}</p>
                                        <p className="text-xs font-semibold text-blue-700">{restoreStatus.progress}%</p>
                                    </div>
                                </div>
                            )}

                            {restoreStatus.stage === 'success' && (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                                    <p className="font-semibold text-green-800">{restoreStatus.message}</p>
                                </div>
                            )}

                            {restoreStatus.stage === 'error' && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                                    <p className="font-semibold text-red-800 mb-3">{restoreStatus.message}</p>
                                    <button onClick={() => setRestoreStatus({ stage: 'idle', progress: 0, message: '' })} className="bg-red-500 text-white text-sm font-semibold py-1 px-4 rounded-md hover:bg-red-600">
                                        Intentar de Nuevo
                                    </button>
                                </div>
                            )}
                            <input type="file" ref={backupInputRef} onChange={handleUploadBackup} accept=".json" className="hidden"/>
                        </div>
                   </div>
                </AccordionItem>

                <AccordionItem title="Configuración Adicional (Próximamente)" isOpen={false} onToggle={() => {}} disabled={true}>
                    <p className="text-gray-500">Esta sección se implementará más adelante con funcionalidades adicionales para personalizar la aplicación.</p>
                </AccordionItem>
            </div>
        </div>
    );
};

export default GestionAppView;