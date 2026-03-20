import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const COLUMNS = [
  { id: 'Consultation', title: 'Consultation', color: 'border-blue-500', bg: 'bg-blue-50/50' },
  { id: 'In-Treatment', title: 'In-Treatment', color: 'border-yellow-500', bg: 'bg-yellow-50/50' },
  { id: 'Recovery', title: 'Recovery', color: 'border-emerald-500', bg: 'bg-emerald-50/50' },
  { id: 'Discharged', title: 'Discharged', color: 'border-purple-500', bg: 'bg-purple-50/50' }
];

export default function PatientsKanban({ patients, onDragEnd, onPatientClick }) {
  const [colSearch, setColSearch] = useState({});

  // Organize patients by their treatment stage and apply column-specific search
  const columnsData = COLUMNS.reduce((acc, col) => {
    // Default to 'Consultation' if treatmentStage is missing
    let stagePatients = patients.filter(p => (p.treatmentStage || 'Consultation') === col.id);
    
    // Apply column search if it exists
    const term = colSearch[col.id]?.toLowerCase() || '';
    if (term) {
      stagePatients = stagePatients.filter(p => 
        (p.firstName || '').toLowerCase().includes(term) || 
        (p.lastName || '').toLowerCase().includes(term) || 
        (p.mobile || '').includes(term)
      );
    }
    
    acc[col.id] = stagePatients;
    return acc;
  }, {});

  const handleSearchChange = (colId, value) => {
    setColSearch(prev => ({ ...prev, [colId]: value }));
  };

  return (
    <div className="w-full flex gap-5 overflow-x-auto pb-6 pt-2 pr-4 custom-scrollbar min-h-[600px]">
      <DragDropContext onDragEnd={onDragEnd}>
        {COLUMNS.map((col) => {
          const columnPatients = columnsData[col.id] || [];

          return (
            <div key={col.id} className="flex flex-col min-w-[280px] w-[280px] shrink-0">
              <div className={`mb-3 border-b-2 ${col.color} pb-3`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-neutral-800">{col.title}</h3>
                  <span className="bg-neutral-100 text-neutral-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-200">
                    {columnPatients.length}
                  </span>
                </div>
                {/* Column-Specific Search */}
                <input
                  type="text"
                  placeholder="Search name/mobile..."
                  value={colSearch[col.id] || ''}
                  onChange={(e) => handleSearchChange(col.id, e.target.value)}
                  className="w-full text-xs py-1.5 px-2 bg-white rounded border border-neutral-200 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-2xl p-3 min-h-[500px] border-2 transition-colors duration-200
                      ${snapshot.isDraggingOver ? 'bg-neutral-100 border-dashed border-primary-400' : `${col.bg} border-transparent`}
                    `}
                  >
                    {columnPatients.map((patient, index) => (
                      <Draggable key={patient.id} draggableId={patient.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 bg-white rounded-lg shadow-sm border border-neutral-200 p-3 cursor-grab hover:shadow hover:border-primary-300 transition-all active:cursor-grabbing
                              ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-[1.02] border-primary-400 z-50' : ''}
                            `}
                            onClick={() => onPatientClick(patient)}
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="inline-block bg-neutral-100 text-neutral-500 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-neutral-200">
                                {patient.patientID}
                              </span>
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
                                {patient.patientStatus || 'Active'}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-neutral-800 mb-0.5 leading-tight">{`${patient.firstName} ${patient.lastName}`}</h4>
                            
                            <p className="text-[10px] font-semibold text-primary-600 mb-2 truncate">{patient.chiefComplaint || 'Consultation'}</p>

                            <div className="flex flex-col gap-1 pt-2 border-t border-neutral-100">
                              <div className="flex items-center text-[10px] text-neutral-500 font-medium">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {patient.mobile}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                  {patient.department || 'N/A'}
                                </span>
                                <div className="w-6 h-6 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-600 shadow-sm" title={`Doctor: ${patient.assignedDoctor || 'Unassigned'}`}>
                                  {(patient.assignedDoctor?.[0] || '?').toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}
