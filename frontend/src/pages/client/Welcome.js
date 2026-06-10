import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import InstallButton from '../../components/InstallButton';
import LanguageContext from '../../context/LanguageContext';
import LangSwitcher from '../../components/LangSwitcher';
import './Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: t('auth', 'welcomeTitle1'),
        subtitle: t('auth', 'welcomeSub1'),
        illustration: '/images/illustrations/welcome.png',
        description: t('auth', 'welcomeDesc1'),
      },
      {
        title: t('auth', 'welcomeTitle2'),
        subtitle: t('auth', 'welcomeSub2'),
        illustration: '/images/illustrations/delivery.png',
        description: t('auth', 'welcomeDesc2'),
      },
      {
        title: t('auth', 'welcomeTitle3'),
        subtitle: t('auth', 'welcomeSub3'),
        illustration: '/images/illustrations/start.png',
        description: t('auth', 'welcomeDesc3'),
      },
    ],
    [t]
  );

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
      <div className="welcome-top-buttons-mobile">
        {currentStep < steps.length - 1 && (
          <button className="skip-btn-mobile" type="button" onClick={handleSkip}>
            {t('auth', 'skip')}
          </button>
        )}
        <div className="welcome-lang-mobile notranslate">
          <LangSwitcher variant="inline" />
        </div>
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
                role="button"
                tabIndex={0}
                className={`step-dot ${index === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(index)}
                onKeyDown={(e) => e.key === 'Enter' && setCurrentStep(index)}
              />
            ))}
          </div>

          <div className="welcome-buttons">
            {currentStep === 0 && (
              <button className="btn btn-outline skip-btn-desktop" type="button" onClick={handleSkip}>
                {t('auth', 'skip')}
              </button>
            )}
            {currentStep > 0 && (
              <button className="btn btn-outline prev-btn-mobile" type="button" onClick={handlePrevious}>
                <span className="prev-icon">←</span>
                <span className="prev-text">{t('auth', 'previous')}</span>
              </button>
            )}
            <button
              className={`btn btn-primary next-btn ${currentStep < steps.length - 1 ? 'has-icon' : 'no-icon'}`}
              type="button"
              onClick={handleNext}
            >
              <span className="next-text">
                {currentStep < steps.length - 1 ? t('auth', 'next') : t('auth', 'start')}
              </span>
              {currentStep < steps.length - 1 && <span className="next-icon">→</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
