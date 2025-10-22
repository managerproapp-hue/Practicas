
import React, { useState, useCallback } from 'react';
import { Student } from '../types';

// Make sure SheetJS is loaded via script tag in index.html
declare var XLSX: any;

interface ImportModalProps {
  onClose: () => void;
  onSave: (students: Student[]) => void;
}

// Fix: Define a type for keys of Student that map to string or undefined properties.
// This helps TypeScript understand that we are only working with primitive, renderable values in this component.
type StudentStringProperty = {
    [K in keyof Student]: Student[K] extends (string | undefined) ? K : never
}[keyof Student];

const HEADER_MAPPING: { [key: string]: StudentStringProperty } = {
  'NRE': 'nre',
  'EXPEDIENTE': 'expediente',
  'APELLIDO 1': 'apellido1',
  'APELLIDO 2': 'apellido2',
  'NOMBRE': 'nombre',
  'GRUPO': 'grupo',
  'SUBGRUPO': 'subgrupo',
  'FECHA DE NACIMIENTO': 'fechaNacimiento',
  'TELÉFONO': 'telefono',
  'TELÉFONO 2': 'telefono2',
  'EMAIL PERSONAL': 'emailPersonal',
  'EMAIL OFICIAL': 'emailOficial',
};

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSave }) => {
  const [importedData, setImportedData] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setImportedData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          setError('El archivo Excel está vacío o no tiene cabeceras.');
          return;
        }

        const headers = (json[0] as string[]).map(h => h.trim().toUpperCase());
        const rows = json.slice(1);

        const mappedStudents: Student[] = rows.map((row: any[]) => {
          const student: Partial<Student> = {};
          headers.forEach((header, index) => {
            const studentKey = HEADER_MAPPING[header];
            if (studentKey) {
              (student as any)[studentKey] = row[index] ? String(row[index]) : '';
            }
          });
          return student as Student;
        }).filter(s => s.nombre && s.apellido1); // Basic validation

        setImportedData(mappedStudents);
      } catch (err) {
        setError('Error al procesar el archivo. Asegúrese de que es un archivo .xlsx válido.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Importar Datos de Alumnos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Seleccionar archivo .xlsx
            </label>
            <input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} />
            {fileName && <span className="ml-4 text-gray-600">{fileName}</span>}
          </div>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}
          {importedData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Vista Previa de Datos ({importedData.length} registros)</h3>
              <div className="overflow-auto border border-gray-200 rounded-lg" style={{maxHeight: '40vh'}}>
                <table className="min-w-full bg-white text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {Object.values(HEADER_MAPPING).map(key => <th key={key} className="py-2 px-3 text-left font-medium text-gray-600">{key}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.map((student, index) => (
                      <tr key={index} className="border-t">
                        {Object.values(HEADER_MAPPING).map(key => <td key={key} className="py-2 px-3">{student[key] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="bg-gray-50 p-4 flex justify-end items-center space-x-4 rounded-b-lg">
          <button onClick={onClose} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave(importedData)}
            disabled={importedData.length === 0}
            className="px-6 py-2 bg-teal-500 text-white font-bold rounded-md hover:bg-teal-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Guardar {importedData.length > 0 ? `(${importedData.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
