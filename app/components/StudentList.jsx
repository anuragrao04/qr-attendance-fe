import React, { useState, useCallback } from "react";

// Memoized individual student component
const StudentItem = React.memo(({ student, onToggle }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleClick = useCallback(() => {
    setIsActive(true);
    onToggle(student.SRN);

    // Reset active state after animation completes
    setTimeout(() => {
      setIsActive(false);
    }, 500);
  }, [student.SRN, onToggle]);

  return (
    <div
      className={`bg-muted rounded-lg p-2 text-center flex flex-col relative cursor-pointer transition-all
        ${isActive ? "scale-95 bg-muted/90" : "hover:bg-muted/80"}
        ${student.isPresent ? "border-l-4 border-green-500" : ""}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="text-4xl font-bold">{student.SRN.slice(-5)}</div>
      <div className="text-xs truncate mt-1">{student.name}</div>
      {isHovering && (
        <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center transition-opacity">
          <div className="text-sm font-medium bg-white/90 dark:bg-black/70 px-2 py-1 rounded shadow">
            Click to toggle attendance
          </div>
        </div>
      )}
    </div>
  );
});

// Memoized StudentList component
const StudentList = React.memo(({ students, onToggleAttendance }) => {
  const handleToggle = useCallback(
    (srn) => {
      onToggleAttendance(srn);
    },
    [onToggleAttendance],
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {students.map((student) => (
        <StudentItem
          key={student.SRN}
          student={student}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
});

export default StudentList;
