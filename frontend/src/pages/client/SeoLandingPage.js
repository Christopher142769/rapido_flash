import React, { useEffect, useMemo } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import LANDING_PAGES from './seoLandingData';

const containerStyle = {
  maxWidth: '920px',
  margin: '0 auto',
  padding: '24px 16px 40px',
  color: '#1f2937',
  lineHeight: 1.6,
};

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '14px',
  padding: '20px',
  marginBottom: '16px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
};

const ctaRowStyle = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  marginTop: '8px',
};

const primaryBtnStyle = {
  display: 'inline-block',
  background: '#9f3f16',
  color: '#fff',
  borderRadius: '999px',
  padding: '10px 16px',
  textDecoration: 'none',
  fontWeight: 600,
};

const secondaryBtnStyle = {
  ...primaryBtnStyle,
  background: '#14532d',
};

const relatedLinksStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '10px',
  marginTop: '12px',
};

const relatedItemStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '10px 12px',
  textDecoration: 'none',
  color: '#111827',
  background: '#f9fafb',
  fontWeight: 600,
};

function getSiteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.REACT_APP_SITE_URL || 'https://www.rapido.bj';
}

function getFaqEntries(page) {
  return [
    {
      question: `Quels services sont disponibles pour ${page.title.toLowerCase()} ?`,
      answer:
        'Rapido Flash propose la livraison de repas, de courses, de colis et de documents selon les zones disponibles.',
    },
    {
      question: 'Comment commander une livraison ?',
      answer:
        'Rendez-vous sur la page d’accueil, choisissez votre structure, ajoutez vos produits et validez la commande.',
    },
    {
      question: 'Comment contacter le service client Rapido Flash ?',
      answer: 'Vous pouvez utiliser le bouton appeler ou contacter le support directement depuis la plateforme.',
    },
  ];
}

export default function SeoLandingPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const page = LANDING_PAGES[slug];
  const faqEntries = useMemo(() => (page ? getFaqEntries(page) : []), [page]);
  const relatedPages = useMemo(
    () =>
      Object.entries(LANDING_PAGES)
        .filter(([key]) => key !== slug)
        .slice(0, 6)
        .map(([key, item]) => ({ key, path: item.path, title: item.title })),
    [slug]
  );

  useEffect(() => {
    if (!page) return undefined;

    const origin = getSiteOrigin().replace(/\/$/, '');
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntries.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
      url: `${origin}${page.path}`,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-faq-schema', '1');
    script.text = JSON.stringify(faqSchema);
    document.head.appendChild(script);

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: `${origin}/home`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.title,
          item: `${origin}${page.path}`,
        },
      ],
    };

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.setAttribute('data-seo-breadcrumb-schema', '1');
    breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    return () => {
      script.remove();
      breadcrumbScript.remove();
    };
  }, [faqEntries, page]);

  if (!page) {
    return <Navigate to="/home" replace />;
  }

  return (
    <main style={containerStyle}>
      <article style={cardStyle}>
        <h1>{page.title} | Rapido Flash</h1>
        <p>{page.intro}</p>
        <div style={ctaRowStyle}>
          <Link to="/home" style={primaryBtnStyle}>
            Commander maintenant
          </Link>
          <a href="tel:+2290140393994" style={secondaryBtnStyle}>
            Appeler le service
          </a>
        </div>
      </article>

      {page.sections.map((section) => (
        <section style={cardStyle} key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.text}</p>
        </section>
      ))}

      <section style={cardStyle}>
        <h2>Questions fréquentes</h2>
        {faqEntries.map((faq) => (
          <p key={faq.question}>
            <strong>{faq.question}</strong> {faq.answer}
          </p>
        ))}
      </section>

      <section style={cardStyle}>
        <h2>Pages utiles</h2>
        <p>
          Consultez aussi ces pages pour découvrir les zones desservies et les services de livraison Rapido Flash.
        </p>
        <div style={relatedLinksStyle}>
          {relatedPages.map((item) => (
            <Link key={item.key} to={item.path} style={relatedItemStyle}>
              {item.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

