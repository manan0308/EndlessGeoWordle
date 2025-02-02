import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ChevronRight } from 'lucide-react';

const HintSystem = ({ show, onClose, hints, darkMode, onHintUsed }) => {
  const [revealedHints, setRevealedHints] = useState(1);

  useEffect(() => {
    if (show) {
      setRevealedHints(1);
    }
  }, [show]);

  const revealNextHint = () => {
    if (revealedHints < 3) {
      setRevealedHints(revealedHints + 1);
      onHintUsed(); // Callback to parent component
      // Google Analytics event
      window.gtag('event', 'use_hint', {
        'event_category': 'Game',
        'event_label': `Hint ${revealedHints + 1} Revealed`
      });
    }
  };

  const hintVariants = {
    hidden: { opacity: 0, height: 0, marginBottom: 0 },
    visible: { opacity: 1, height: 'auto', marginBottom: 16 },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`bg-white dark:bg-gray-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl`}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold flex items-center text-black dark:text-white">
                <MapPin className="mr-2" size={24} />
                Hints
              </h2>
              <button 
                onClick={() => {
                  onClose();
                  // Google Analytics event for closing hint system
                  window.gtag('event', 'close_hint_system', {
                    'event_category': 'Game',
                    'event_label': 'Hint System Closed'
                  });
                }} 
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <X size={24} className="text-black dark:text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((level) => (
                <motion.div
                  key={level}
                  variants={hintVariants}
                  initial="hidden"
                  animate={level <= revealedHints ? "visible" : "hidden"}
                  transition={{ duration: 0.5 }}
                  className={`${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black'} p-4 rounded-lg ${
                    level <= revealedHints ? '' : 'hidden'
                  }`}
                >
                  <p className="font-semibold text-lg mb-2">Hint {level}:</p>
                  <p>{hints[`hint${level}`]}</p>
                </motion.div>
              ))}
              {revealedHints < 3 && (
                <motion.button
                  onClick={revealNextHint}
                  className={`w-full mt-4 px-4 py-3 rounded-lg flex items-center justify-center font-semibold ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } transition-colors`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Reveal Next Hint
                  <ChevronRight className="ml-2" size={20} />
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HintSystem;