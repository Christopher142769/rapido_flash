import React from 'react';
import { getRepasProductCopy } from './repasProductCopy';
import { fmtXof } from './repasRefonteConstants';
import { mealDeliveryFeeForCity } from '../../utils/mealShopSettings';

const STEPS = [
  { n: '1', title: 'Vous choisissez', text: 'Votre plat, votre taille, votre accompagnement, en quelques touches.' },
  { n: '2', title: 'King Fish cuisine', text: 'Votre plat est préparé en cuisine, puis confié à un livreur Rapido.' },
  { n: '3', title: 'Vous payez à la livraison', text: 'Livré chez vous, de 09h à minuit. Espèces ou Mobile Money, rien à payer en ligne.' },
];

function PitchImage({ src, alt, caption }) {
  const [broken, setBroken] = React.useState(false);
  if (broken) return null;
  return (
    <figure className="meal-pitch-figure">
      <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/** Partie haute (avant la commande) : pitch, photos, bénéfices. */
export default function MealProductPitch({ slug, productName, heroImage }) {
  const copy = getRepasProductCopy(slug);
  if (!copy) return null;
  const images = copy.images?.length
    ? copy.images
    : heroImage
      ? [{ src: heroImage, caption: copy.hook }]
      : [];
  const [first, ...rest] = images;

  return (
    <section id="meal-section-pitch" className="meal-pitch meal-pitch--top" aria-label="Pourquoi commander ce plat">
      <h2 className="meal-pitch-title">Pourquoi vous allez l’aimer</h2>
      <p className="meal-pitch-lead">{copy.pitch}</p>
      {first ? <PitchImage src={first.src} alt={`${productName} — ${first.caption || ''}`} caption={first.caption} /> : null}
      <ul className="meal-pitch-benefits">
        {copy.benefits.map((b) => (
          <li key={b.title}>
            <strong>{b.title}</strong>
            <span>{b.text}</span>
          </li>
        ))}
      </ul>
      {rest.map((img) => (
        <PitchImage key={img.src} src={img.src} alt={`${productName} — ${img.caption || ''}`} caption={img.caption} />
      ))}
      {copy.idealFor ? (
        <p className="meal-pitch-ideal">
          <b>Idéal pour :</b> {copy.idealFor}
        </p>
      ) : null}
    </section>
  );
}

/** Partie basse (après la commande) : comment ça marche, FAQ, dernier appel à l'action. */
export function MealProductPitchMore({ slug, settings, whatsappDisplay, onOrderClick }) {
  const copy = getRepasProductCopy(slug);
  if (!copy) return null;

  const faq = [
    copy.faq,
    {
      q: 'En combien de temps suis-je livré ?',
      a: 'Nous livrons à Cotonou et à Calavi, de 09h à minuit. Le délai dépend de la distance et de l’affluence ; vous pouvez suivre votre commande sur WhatsApp.',
    },
    {
      q: 'Comment payer ?',
      a: 'À la livraison, en espèces ou en Mobile Money. Vous ne payez rien en ligne : vous réglez quand votre commande arrive.',
    },
    {
      q: 'Combien coûte la livraison ?',
      a: `${fmtXof(mealDeliveryFeeForCity(settings, 'Cotonou'))} F à Cotonou et ${fmtXof(
        mealDeliveryFeeForCity(settings, 'Calavi')
      )} F à Calavi. Le total exact s’affiche avant de confirmer.`,
    },
    {
      q: 'Puis-je demander une cuisson ou une préférence ?',
      a: 'Oui : écrivez-la dans « Spécifications du plat » (bien cuit, sans oignon, peu épicé…).',
    },
    {
      q: 'Comment suivre ma commande ?',
      a: `Après la commande, le bouton « Suivre ma commande » ouvre WhatsApp vers l’équipe${
        whatsappDisplay ? ` (${whatsappDisplay})` : ''
      }.`,
    },
  ].filter((f) => f && f.q && f.a);

  return (
    <section className="meal-pitch meal-pitch--more" aria-label="Comment ça marche et questions fréquentes">
      <h3 className="meal-pitch-sub">Comment ça marche</h3>
      <ol className="meal-pitch-steps">
        {STEPS.map((s) => (
          <li key={s.n}>
            <span className="meal-pitch-step-n" aria-hidden="true">
              {s.n}
            </span>
            <div>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </div>
          </li>
        ))}
      </ol>

      <h3 className="meal-pitch-sub">Questions fréquentes</h3>
      <div className="meal-pitch-faq">
        {faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>

      <button type="button" className="meal-pitch-cta" onClick={onOrderClick}>
        Commander maintenant
      </button>
      <p className="meal-pitch-note">Paiement à la livraison · Cotonou &amp; Calavi · de 09h à minuit</p>
    </section>
  );
}
