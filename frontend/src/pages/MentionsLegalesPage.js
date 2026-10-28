import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_INFO } from '../config/legalInfo';
import { getShopWhatsAppDisplay } from '../utils/shopOrder';
import { MEAL_SHOP_DEFAULTS } from './repas/repasRefonteConstants';
import './MentionsLegalesPage.css';

export default function MentionsLegalesPage() {
  useEffect(() => {
    document.title = 'Mentions légales — Rapido';
  }, []);

  const identity = [
    ['Marque', LEGAL_INFO.brand],
    ['Dénomination', LEGAL_INFO.companyName],
    ['Forme juridique', LEGAL_INFO.legalForm],
    ['Immatriculation (RCCM)', LEGAL_INFO.rccm],
    ['Identifiant fiscal (IFU)', LEGAL_INFO.ifu],
    ['Siège', LEGAL_INFO.address],
    ['Directeur de la publication', LEGAL_INFO.publicationDirector],
  ].filter(([, v]) => v);

  return (
    <main className="legal-page">
      <Link to="/" className="legal-back">← Retour au site</Link>
      <h1>Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <dl>
        {identity.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt>Sites</dt>
          <dd>rapido.online · rapido.bj</dd>
        </div>
      </dl>

      <h2>Contact</h2>
      <p>
        {LEGAL_INFO.email ? <>E-mail : {LEGAL_INFO.email}<br /></> : null}
        WhatsApp Rapido Repas : {MEAL_SHOP_DEFAULTS.whatsappDisplay}
        <br />
        WhatsApp poisson frais : {getShopWhatsAppDisplay()}
      </p>

      {LEGAL_INFO.hosting ? (
        <>
          <h2>Hébergement</h2>
          <p>{LEGAL_INFO.hosting}</p>
        </>
      ) : null}

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, photographies, logos et éléments graphiques du site sont la propriété de Rapido ou de ses
        partenaires (dont King Fish) et ne peuvent être reproduits sans autorisation préalable.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Les informations que vous nous confiez (nom, téléphone, adresse de livraison) servent uniquement à traiter
        vos commandes. Pour en savoir plus et exercer vos droits, consultez notre{' '}
        <Link to="/politique-confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>Paiement et livraison</h2>
      <p>
        Les commandes Rapido Repas sont payées à la livraison. Les zones desservies sont Cotonou et Abomey-Calavi,
        selon les horaires indiqués sur le site.
      </p>

      <p className="legal-links">
        <Link to="/politique-confidentialite">Politique de confidentialité</Link>
      </p>
    </main>
  );
}
