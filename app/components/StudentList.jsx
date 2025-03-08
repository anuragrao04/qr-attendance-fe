"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0.9, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.95 }}
      className="relative"
    >
      <Card
        className={`p-4 h-full cursor-pointer transition-all duration-300 overflow-hidden
          ${isActive ? "bg-muted/90" : "hover:bg-muted/80"}
          ${student.isPresent ? "border-l-4 border-green-500" : "border-l-4 border-transparent"}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Attendance indicator */}
        {student.isPresent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2"
          >
            <CheckCircle className="h-5 w-5 text-green-500" />
          </motion.div>
        )}

        {/* Student ID */}
        <div className="text-4xl font-bold text-center">
          {student.SRN.slice(-5)}
        </div>

        {/* Student Name */}
        <div className="text-xs text-center truncate mt-1 text-muted-foreground">
          {student.name}
        </div>

        {/* Hover overlay with color tint */}
        <AnimatePresence>
          {isHovering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`absolute inset-0 rounded-lg flex items-center justify-center ${student.isPresent
                  ? "bg-red-500/10 dark:bg-red-950/30" // Red tint for "mark as absent"
                  : "bg-green-500/10 dark:bg-green-950/30" // Green tint for "mark as present"
                }`}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`absolute bottom-3 left-0 right-0 mx-auto w-fit px-2.5 py-1 rounded-full flex items-center gap-1.5 ${student.isPresent
                    ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200"
                    : "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-200"
                  }`}
              >
                {student.isPresent ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-xs font-medium">Mark Absent</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-medium">Mark Present</span>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
});

StudentItem.displayName = "StudentItem";

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

StudentList.displayName = "StudentList";

export default StudentList;
