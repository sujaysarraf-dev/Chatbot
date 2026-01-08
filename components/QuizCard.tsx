
import React, { useState, useMemo } from 'react';
import { QuizData } from '../types';
import { saveQuizResult } from '../services/supabase';

interface QuizCardProps {
  quiz: QuizData;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null));
  const [answeredSteps, setAnsweredSteps] = useState<boolean[]>(new Array(quiz.questions.length).fill(false));
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = quiz.questions[currentStep];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentStep + 1) / totalQuestions) * 100;

  const score = useMemo(() => {
    return userAnswers.reduce((acc, ans, idx) => {
      if (answeredSteps[idx] && ans === quiz.questions[idx].correctAnswerIndex) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [userAnswers, answeredSteps, quiz.questions]);

  const handleOptionSelect = (idx: number) => {
    if (answeredSteps[currentStep]) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentStep] = idx;
    setUserAnswers(newAnswers);
  };

  const handleCheck = () => {
    if (userAnswers[currentStep] === null) return;
    const newAnswered = [...answeredSteps];
    newAnswered[currentStep] = true;
    setAnsweredSteps(newAnswered);
  };

  const handleNext = () => {
    if (currentStep + 1 < totalQuestions) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsFinished(true);
      // Save result to cloud
      saveQuizResult(quiz.title, score, totalQuestions);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleRetake = () => {
    setCurrentStep(0);
    setUserAnswers(new Array(quiz.questions.length).fill(null));
    setAnsweredSteps(new Array(quiz.questions.length).fill(false));
    setIsFinished(false);
  };

  if (isFinished) {
    const percentage = (score / totalQuestions) * 100;
    let rank = "Explorer 🧭";
    let message = "Keep learning, you're getting there!";
    
    if (percentage === 100) {
      rank = "Genius 🧠";
      message = "Absolute Perfection! You mastered this topic.";
    } else if (percentage >= 60) {
      rank = "Star Student 🌟";
      message = "Great job! You have a solid grasp of this.";
    }

    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 rounded-2xl p-6 text-center shadow-xl animate-message">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-indigo-200">
          <span className="text-4xl">{percentage === 100 ? '🏆' : '📚'}</span>
        </div>
        <div className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Score Synced to Cloud</div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">{rank}</h3>
        <p className="text-indigo-600 font-bold text-sm mb-4 uppercase tracking-widest">Final Score: {score}/{totalQuestions}</p>
        <p className="text-slate-600 font-medium mb-6">{message}</p>
        
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetake}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-indigo-100"
          >
            Retake Quiz 🔄
          </button>
          <button
            onClick={() => { setIsFinished(false); setCurrentStep(0); }}
            className="w-full py-3 bg-white text-indigo-600 border-2 border-indigo-100 rounded-xl font-bold hover:bg-indigo-50 transition-all text-sm"
          >
            Review Answers
          </button>
        </div>
      </div>
    );
  }

  const isCurrentAnswered = answeredSteps[currentStep];
  const selectedOption = userAnswers[currentStep];

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-xl animate-message max-w-full">
      {/* Header / Progress */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button 
              onClick={handleBack}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              title="Go Back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {quiz.title}
          </span>
        </div>
        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
          {currentStep + 1} / {totalQuestions}
        </span>
      </div>
      
      <div className="h-1.5 w-full bg-slate-100">
        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="p-6">
        <h4 className="text-lg font-bold text-slate-800 mb-6 leading-tight">
          {currentQuestion.question}
        </h4>
        
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, idx) => {
            let stateClass = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50";
            
            if (selectedOption === idx) {
              stateClass = "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20";
            }
            
            if (isCurrentAnswered) {
              if (idx === currentQuestion.correctAnswerIndex) {
                stateClass = "border-green-500 bg-green-50 ring-2 ring-green-500/20";
              } else if (selectedOption === idx) {
                stateClass = "border-rose-500 bg-rose-50 ring-2 ring-rose-500/20";
              } else {
                stateClass = "border-slate-100 opacity-50";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isCurrentAnswered}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3 group ${stateClass}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedOption === idx ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                } ${isCurrentAnswered && idx === currentQuestion.correctAnswerIndex ? 'border-green-500 bg-green-500' : ''}
                  ${isCurrentAnswered && selectedOption === idx && idx !== currentQuestion.correctAnswerIndex ? 'border-rose-500 bg-rose-500' : ''}
                `}>
                  {(selectedOption === idx || (isCurrentAnswered && idx === currentQuestion.correctAnswerIndex)) && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </div>
                <span className={`text-[15px] font-semibold ${selectedOption === idx ? 'text-indigo-900' : 'text-slate-600'}`}>
                  {option}
                </span>
                {isCurrentAnswered && idx === currentQuestion.correctAnswerIndex && (
                  <svg className="w-5 h-5 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {isCurrentAnswered && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-message">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teacher's Note:</p>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              Back
            </button>
          )}
          
          {!isCurrentAnswered ? (
            <button
              onClick={handleCheck}
              disabled={selectedOption === null}
              className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all ${
                selectedOption === null 
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
              }`}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all active:scale-95"
            >
              {currentStep + 1 === totalQuestions ? 'See Final Score' : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
