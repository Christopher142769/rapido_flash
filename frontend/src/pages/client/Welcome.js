import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InstallButton from '../../components/InstallButton';
import './Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Bienvenue sur Rapido",
      subtitle: "Votre plateforme de livraison préférée",
      illustration: "/images/illustrations/welcome.png",
      description: "Commandez vos plats préférés et recevez-les rapidement à votre porte"
    },
    {
      title: "Livraison rapide",
      subtitle: "Où que vous soyez",
      illustration: "/images/illustrations/delivery.png",
      description: "Trouvez les restaurants les plus proches et commandez en quelques clics"
    },
    {
      title: "Commencez maintenant",
      subtitle: "C'est simple et rapide",
      illustration: "/images/illustrations/start.png",
      description: "Ajoutez votre position et découvrez les meilleurs restaurants près de chez vous"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/location');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigate('/location');
  };

  return (
    <div className="welcome-page">
      {/* Bouton Passer en haut à gauche (mobile) */}
      <div className="welcome-top-buttons-mobile">
        {currentStep < steps.length - 1 && (
          <button className="skip-btn-mobile" onClick={handleSkip}>
            Passer
          </button>
        )}
        <InstallButton variant="icon" />
      </div>
      
      <div className="welcome-content">
        <div className="welcome-illustration">
          <div className="illustration-wrapper">
            <img 
              src={steps[currentStep].illustration} 
              alt={steps[currentStep].title}
              className="illustration-image"
            />
          </div>
        </div>
        
        <div className="welcome-text">
          <h1 className="welcome-title">{steps[currentStep].title}</h1>
          <h2 className="welcome-subtitle">{steps[currentStep].subtitle}</h2>
          <p className="welcome-description">{steps[currentStep].description}</p>
        </div>

        <div className="welcome-navigation">
          <div className="steps-indicator">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`step-dot ${index === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>
          
          <div className="welcome-buttons">
            {/* Bouton Passer (desktop) - seulement sur la première étape */}
            {currentStep === 0 && (
              <button className="btn btn-outline skip-btn-desktop" onClick={handleSkip}>
                Passer
              </button>
            )}
            {/* Bouton Précédent (mobile uniquement) */}
            {currentStep > 0 && (
              <button className="btn btn-outline prev-btn-mobile" onClick={handlePrevious}>
                <span className="prev-icon">←</span>
                <span className="prev-text">Précédent</span>
              </button>
            )}
            {/* Bouton Suivant avec icône pour mobile */}
            <button className={`btn btn-primary next-btn ${currentStep < steps.length - 1 ? 'has-icon' : 'no-icon'}`} onClick={handleNext}>
              <span className="next-text">{currentStep < steps.length - 1 ? 'Suivant' : 'Commencer'}</span>
              {currentStep < steps.length - 1 && (
                <span className="next-icon">→</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
