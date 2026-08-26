/**
 * /bassins landing conversion (Montserrat).
 * Réserver → formulaire ; Contacter / qualifier → WhatsApp.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BASSINS_FORM_PATH } from '../data/bassinsFunnel';
import { trackMeta } from '../utils/metaPixel';
import './BassinsPage.css';

const WA_DIGITS = '2290129404040';
const WA_DISPLAY = '+229 01 29 40 40 40';
const LOGO = '/images/logo.png';
const HERO_IMG = '/bassins/hero-bassin.png';

const DEFAULT_WA_MSG =
  "Bonjour, je suis intéressé(e) par le bassin à poisson à 670 000 FCFA. Pouvez vous m'en dire plus ?";

function waUrl(msg = DEFAULT_WA_MSG) {
  return `https://wa.me/${WA_DIGITS}?text=${encodeURIComponent(msg)}`;
}

const FAQ_ITEMS = [
  {
    q: "Qu est ce qui est exactement inclus dans les 670 000 FCFA ?",
    a: 'Ce montant couvre le bassin hors sol, son transport et son installation complète chez vous par notre équipe. La formation initiale et l’accompagnement après installation sont offerts, sans coût supplémentaire.',
  },
  {
    q: 'Ai je besoin d’un grand terrain ?',
    a: 'Non. Une petite cour ou un espace équivalent à quelques mètres carrés suffit pour installer un bassin. C’est pensé pour les foyers urbains et périurbains qui n’ont pas de grand champ.',
  },
  {
    q: 'Je n’y connais rien en élevage de poisson, est ce un problème ?',
    a: 'C’est justement pour cela que la formation et l’accompagnement sont inclus. Nous vous montrons les gestes essentiels dès l’installation, et notre équipe reste joignable si vous avez des questions par la suite.',
  },
  {
    q: 'Que se passe t il si des poissons tombent malades ?',
    a: 'Nous vous formons à repérer les signes d’alerte dès le départ pour limiter ce risque, et notre équipe reste disponible pour vous conseiller en cas de doute. Comme pour toute activité d’élevage, un minimum de suivi reste nécessaire de votre côté.',
  },
  {
    q: 'Où vais je vendre mes poissons une fois prêts ?',
    a: 'Le marché local du poisson est déjà bien établi au Bénin (marchés de quartier, poissonniers, restaurants). Nous pouvons vous orienter sur les débouchés les plus courants dans votre zone lors de l’accompagnement.',
  },
  {
    q: 'Combien coûte l’alimentation chaque mois ?',
    a: 'Le coût dépend de la taille de votre bassin et du nombre de poissons. Nous vous donnons une estimation précise et les sources d’approvisionnement locales lors de notre échange, selon votre projet.',
  },
  {
    q: 'Puis je voir un bassin déjà installé ou parler à un client ?',
    a: 'Oui, c’est une demande légitime avant un investissement de cette taille. Contactez notre équipe pour organiser une visite ou une mise en relation selon les disponibilités.',
  },
  {
    q: 'Dans quelles zones intervenez vous ?',
    a: 'Nous intervenons actuellement dans le Grand Cotonou, Abomey Calavi et Porto Novo. D’autres zones peuvent être étudiées au cas par cas, contactez nous pour vérifier la faisabilité dans votre secteur.',
  },
  {
    q: 'Puis je payer en plusieurs fois ?',
    a: 'Contactez notre équipe pour discuter des modalités qui conviennent à votre situation.',
  },
];

function useFontAwesome() {
  useEffect(() => {
    const id = 'bassins-fa-cdn';
    if (document.getElementById(id)) return undefined;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(link);
    return undefined;
  }, []);
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectionLink({ to, className, children }) {
  const id = to.replace(/^#/, '');
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection(id);
      }}
    >
      {children}
    </a>
  );
}

function BassinsPage() {
  useFontAwesome();
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const gaugeRef = useRef(null);

  const [openFaq, setOpenFaq] = useState(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [gaugeFilled, setGaugeFilled] = useState(false);
  const [qPanel, setQPanel] = useState('1');
  const [qAnswers, setQAnswers] = useState({});
  const [qSelected, setQSelected] = useState({});

  useEffect(() => {
    trackMeta('ViewContent', { content_name: 'bassins_landing' });
  }, []);

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      requestAnimationFrame(() => scrollToSection(hash));
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const nodes = root.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal--visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const gauge = gaugeRef.current;
    if (!gauge) return undefined;
    const gio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(() => setGaugeFilled(true), 200);
            gio.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    gio.observe(gauge);
    return () => gio.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      setStickyVisible(hero.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const targets = root.querySelectorAll('[data-parallax]');
    let raf = 0;
    const update = () => {
      const vh = window.innerHeight || 1;
      targets.forEach((el) => {
        const speed = Number(el.getAttribute('data-parallax')) || 0.2;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (vh / 2 - center) * speed;
        const clamped = Math.max(-56, Math.min(56, offset));
        el.style.setProperty('--parallax-y', `${clamped.toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const onQualifier = (q, a) => {
    setQAnswers((prev) => ({ ...prev, [q]: a }));
    setQSelected((prev) => ({ ...prev, [q]: a }));
    setTimeout(() => {
      if (q === '1') setQPanel('2');
      else setQPanel('result');
    }, 260);
  };

  let reassurance = '';
  if (qPanel === 'result') {
    if (qAnswers['1'] === "Oui, j'ai de l'espace") {
      reassurance =
        'Parfait, votre espace correspond à ce que nous recherchons pour une installation standard.';
    } else {
      reassurance =
        'Pas de souci : une cour de quelques mètres carrés suffit généralement. Nous vérifions cela ensemble lors de notre échange.';
    }
    if (qAnswers['2'] === 'Pas encore') {
      reassurance +=
        " Notre accompagnement est surtout pensé pour des personnes ayant déjà une capacité d'épargne mobilisable : nous en discuterons ensemble pour voir si le projet est adapté à votre situation.";
    }
  }

  const qualifierWaMsg = `Bonjour, je suis intéressé(e) par le bassin à poisson à 670 000 FCFA.\nEspace disponible : ${qAnswers['1'] || ''}\nActivité économique actuelle : ${qAnswers['2'] || ''}`;

  return (
    <div className="bassins-landing" ref={rootRef}>
      <header className="nav">
        <div className="nav__inner">
          <SectionLink to="#top" className="nav__logo">
            <img src={LOGO} alt="Rapido" />
          </SectionLink>
          <nav className="nav__links">
            <SectionLink to="#solution">Le Bassin</SectionLink>
            <SectionLink to="#offre">L&apos;Offre</SectionLink>
            <SectionLink to="#avis">Avis</SectionLink>
            <SectionLink to="#faq">FAQ</SectionLink>
          </nav>
          <a
            href={waUrl()}
            className="btn btn--primary btn--nav"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fa-brands fa-whatsapp" /> Nous contacter
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="top" ref={heroRef}>
          <div className="container hero__grid" data-parallax="0.1">
            <div className="hero__content reveal">
              <span className="badge">
                <i className="fa-solid fa-trophy" /> N°1 de l&apos;élevage de machoiron au Bénin
              </span>
              <h1>
                Et si votre épargne
                <br />
                travaillait <em>enfin</em>
                <br />
                pour vous ?
              </h1>
              <p className="hero__sub">
                Un bassin d&apos;élevage de poisson installé chez vous par notre équipe, pas besoin
                d&apos;un grand terrain, une petite cour suffit. Formation et accompagnement offerts,
                du premier jour à votre première récolte.
              </p>
              <div className="hero__cta-row">
                <SectionLink to="#offre" className="btn btn--primary btn--lg">
                  Je découvre l&apos;offre complète <i className="fa-solid fa-arrow-right" />
                </SectionLink>
                <div className="hero__rating">
                  <span className="stars">★★★★★</span> 4,9/5 sur les avis clients
                </div>
              </div>
              <p className="hero__microcopy">
                <i className="fa-solid fa-circle-check" /> 670 000 FCFA  Installation incluse
                Accompagnement offert
              </p>
            </div>
            <div className="hero__visual reveal">
              <div className="hero__parallax" data-parallax="0.28">
                <img
                  className="hero__img"
                  src={HERO_IMG}
                  alt="Bassin hors sol pour l'élevage de poisson, structure en acier galvanisé"
                />
                <div className="floater floater--1">
                  <i className="fa-solid fa-shield-halved" /> Acier galvanisé renforcé
                </div>
                <div className="floater floater--2">
                  <i className="fa-solid fa-truck-fast" /> Installation en 1 jour
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section problem" id="probleme">
          <div className="container" data-parallax="0.14">
            <span className="eyebrow">LE VRAI PROBLÈME</span>
            <h2 className="h2">
              Ce n&apos;est pas votre motivation qui manque.
              <br />
              C&apos;est une occasion concrète.
            </h2>
            <p className="section-intro">Vous reconnaissez peut être une partie de votre situation ici :</p>
            <div className="problem__grid">
              <div className="problem-card reveal">
                <div className="problem-card__icon">
                  <i className="fa-solid fa-arrows-rotate" />
                </div>
                <h3>Votre activité tourne, sans plus</h3>
                <p>
                  Mêmes clients, mêmes produits, marges qui se resserrent. Vous sentez que vous
                  n&apos;avancez plus vraiment, sans savoir par où passer à l&apos;étape suivante.
                </p>
              </div>
              <div className="problem-card reveal">
                <div className="problem-card__icon">
                  <i className="fa-solid fa-piggy-bank" />
                </div>
                <h3>Votre épargne ne rapporte rien</h3>
                <p>
                  Elle dort sur un compte, dans une tontine, ou dans la trésorerie de votre commerce,
                  pendant que le coût de la vie augmente autour de vous.
                </p>
              </div>
              <div className="problem-card reveal">
                <div className="problem-card__icon">
                  <i className="fa-solid fa-circle-question" />
                </div>
                <h3>Vous n&apos;osez pas vous lancer seul(e)</h3>
                <p>
                  Vous n&apos;y connaissez rien en élevage de poisson, et vous avez déjà vu des
                  connaissances perdre de l&apos;argent dans des projets « rentables » qui ne
                  l&apos;étaient pas.
                </p>
              </div>
              <div className="problem-card reveal">
                <div className="problem-card__icon">
                  <i className="fa-solid fa-house" />
                </div>
                <h3>Vous pensiez qu&apos;il fallait un grand terrain</h3>
                <p>
                  Beaucoup mettent ce projet de côté en pensant qu&apos;il faut un grand champ. En
                  réalité, une petite cour derrière la maison suffit largement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section solution" id="solution">
          <div className="container" data-parallax="0.16">
            <span className="eyebrow">NOTRE APPROCHE</span>
            <h2 className="h2">Trois éléments, dans cet ordre précis</h2>
            <p className="section-intro">
              Un seul objectif : que vous puissiez démarrer sereinement, même sans expérience.
            </p>
            <div className="solution__grid">
              <div className="solution-card reveal">
                <span className="solution-card__num">01</span>
                <div className="solution-card__icon">
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <h3>Un bassin importé, robuste, pensé pour durer</h3>
                <p>
                  Structure en acier galvanisé résistant à la corrosion, bâche renforcée. Aucune
                  construction lourde n&apos;est nécessaire : le bassin s&apos;installe rapidement,
                  même dans un espace modeste.
                </p>
              </div>
              <div className="solution-card reveal">
                <span className="solution-card__num">02</span>
                <div className="solution-card__icon">
                  <i className="fa-solid fa-screwdriver-wrench" />
                </div>
                <h3>Une installation professionnelle, chez vous</h3>
                <p>
                  Notre équipe se déplace pour installer le bassin directement à votre domicile.
                  Vous n&apos;avez rien à construire ni à assembler vous même.
                </p>
              </div>
              <div className="solution-card reveal">
                <span className="solution-card__num">03</span>
                <div className="solution-card__icon">
                  <i className="fa-solid fa-graduation-cap" />
                </div>
                <h3>Une formation et un accompagnement offerts</h3>
                <p>
                  Dès l&apos;installation, nous vous montrons les gestes essentiels : nourrissage,
                  qualité de l&apos;eau, signes d&apos;alerte à surveiller. Notre équipe reste
                  disponible ensuite, vous n&apos;êtes jamais seul(e).
                </p>
              </div>
            </div>
            <div className="trust-strip reveal">
              <i className="fa-solid fa-fish" />
              <p>
                <strong>Pourquoi nous, et pas un simple vendeur de bassins ?</strong>
                <br />
                Nous ne sommes pas qu&apos;un fournisseur d&apos;équipement : nous sommes nous mêmes
                producteurs, et nous vendons plus de 5 tonnes de poisson chaque semaine au Bénin. Ce
                que nous vous transmettons, c&apos;est une expérience que nous appliquons chaque
                jour.
              </p>
            </div>
          </div>
        </section>

        <section className="section proof" id="preuve">
          <div className="container" data-parallax="0.14">
            <span className="eyebrow eyebrow--light">POURQUOI NOUS FAIRE CONFIANCE</span>
            <h2 className="h2">Nous ne sommes pas qu&apos;un vendeur de bassins</h2>
            <p className="section-intro">
              Nous sommes nous mêmes producteurs de poisson au Bénin. Ce que nous installons chez
              vous, c&apos;est l&apos;équipement que nous utilisons et maîtrisons chaque jour.
            </p>
            <div className="proof__grid">
              <div className="stat-card reveal">
                <i className="fa-solid fa-trophy" />
                <span className="stat-card__num">N°1</span>
                <span className="stat-card__label">Producteur de machoiron d&apos;élevage au Bénin</span>
              </div>
              <div className="stat-card reveal">
                <i className="fa-solid fa-fish" />
                <span className="stat-card__num">+5 tonnes</span>
                <span className="stat-card__label">de poisson vendues chaque semaine</span>
              </div>
              <div className="stat-card reveal">
                <i className="fa-solid fa-star" />
                <span className="stat-card__num">4,9/5</span>
                <span className="stat-card__label">de moyenne sur les avis clients</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section offer" id="offre">
          <div className="container offer__grid" data-parallax="0.18">
            <div className="reveal">
              <div className={`gauge${gaugeFilled ? ' is-filled' : ''}`} id="gauge" ref={gaugeRef}>
                <div className="gauge__overflow">
                  <span className="gauge__overflow-badge">OFFERT</span>
                  <span className="gauge__overflow-label">Formation + accompagnement</span>
                </div>
                <div className="gauge__tank">
                  <div className="gauge__band gauge__band--install">Installation chez vous</div>
                  <div className="gauge__band gauge__band--bassin">Bassin hors sol</div>
                </div>
              </div>
              <p className="gauge__caption">Ce que couvre votre paiement, et ce qui est offert en plus</p>
            </div>

            <div className="reveal">
              <span className="eyebrow">L&apos;OFFRE</span>
              <h2 className="h2">Ce que vous obtenez pour</h2>
              <div className="price-tag">
                670 000 <span>FCFA</span>
              </div>
              <ul className="offer__list">
                <li>
                  <i className="fa-solid fa-check" /> Le bassin hors sol, importé et durable
                </li>
                <li>
                  <i className="fa-solid fa-check" /> L&apos;installation complète chez vous
                </li>
                <li>
                  <i className="fa-solid fa-gift" /> Formation + accompagnement <strong>offerts</strong>
                </li>
              </ul>
              <div className="callout">
                <strong>Un investissement, pas une dépense courante</strong>
                <p>
                  670 000 FCFA, c&apos;est une décision de capital, comme l&apos;achat d&apos;une
                  moto à mettre en location, ou l&apos;agrandissement d&apos;un stock de commerce. La
                  plupart de nos clients financent ce projet via une épargne de commerce, une
                  tontine, ou en réorientant un capital déjà destiné à un autre investissement.
                </p>
              </div>
              <Link to={BASSINS_FORM_PATH} className="btn btn--primary btn--lg">
                Réserver mon bassin <i className="fa-solid fa-arrow-right" />
              </Link>
              <p className="microcopy">
                <i className="fa-solid fa-circle-check" /> Paiement unique  Aucun frais caché après
                l&apos;installation
              </p>
            </div>
          </div>
        </section>

        <section className="section testimonials" id="avis">
          <div className="container" data-parallax="0.14">
            <span className="eyebrow">ILS SE SONT LANCÉS</span>
            <h2 className="h2">Ce qu&apos;en disent nos clients</h2>
            <div className="testimonials__grid">
              <div className="testimonial-card reveal">
                <div className="testimonial-card__head">
                  <div className="avatar">BK</div>
                  <div>
                    <div className="testimonial-card__name">Bruno K.</div>
                    <div className="testimonial-card__city">Abomey Calavi</div>
                  </div>
                </div>
                <div className="testimonial-card__stars">★★★★★</div>
                <p className="quote">
                  « Ce qui m&apos;a convaincu, c&apos;est qu&apos;ils sont restés disponibles après
                  l&apos;installation. Je n&apos;étais pas seul quand j&apos;ai eu mes premières
                  questions. »
                </p>
              </div>
              <div className="testimonial-card reveal">
                <div className="testimonial-card__head">
                  <div className="avatar">CA</div>
                  <div>
                    <div className="testimonial-card__name">Chantal A.</div>
                    <div className="testimonial-card__city">Cotonou</div>
                  </div>
                </div>
                <div className="testimonial-card__stars">★★★★★</div>
                <p className="quote">
                  « Je n&apos;avais qu&apos;une petite cour derrière la maison. Je pensais que ce
                  n&apos;était pas suffisant. L&apos;équipe est venue, a tout installé, et ça a
                  suffi. »
                </p>
              </div>
              <div className="testimonial-card reveal">
                <div className="testimonial-card__head">
                  <div className="avatar">SD</div>
                  <div>
                    <div className="testimonial-card__name">Serge D.</div>
                    <div className="testimonial-card__city">Porto Novo</div>
                  </div>
                </div>
                <div className="testimonial-card__stars">★★★★★</div>
                <p className="quote">
                  « J&apos;ai comparé avec d&apos;autres projets avant de me décider. Ici, on
                  m&apos;a expliqué clairement ce qui était inclus, sans rien me cacher. »
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section faq" id="faq">
          <div className="container faq__layout" data-parallax="0.12">
            <div className="faq__intro">
              <span className="eyebrow">VOS QUESTIONS</span>
              <h2 className="h2">Avant de vous décider</h2>
              <p className="faq__lead">
                Les réponses les plus demandées avant de réserver un bassin. Cliquez pour ouvrir
                chaque question.
              </p>
            </div>
            <div className="faq__list">
              {FAQ_ITEMS.map((item, i) => (
                <div key={item.q} className={`faq-item${openFaq === i ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="faq-item__q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{item.q}</span>
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                  </button>
                  <div className="faq-item__a">
                    <div className="faq-item__a-inner">{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section final-cta" id="cta">
          <div className="container final-cta__layout" data-parallax="0.16">
            <div className="final-cta__intro">
              <span className="eyebrow eyebrow--light">DERNIÈRE ÉTAPE</span>
              <h2 className="h2">Parlons de votre projet</h2>
              <p className="final-cta__lead">
                Un échange avec notre équipe ne vous engage à rien. Nous vérifions ensemble si votre
                espace est adapté et répondons à toutes vos questions.
              </p>
            </div>

            <div className="qualifier reveal" id="qualifier">
              <div className="qualifier__panel" hidden={qPanel !== '1'}>
                <p className="qualifier__q">
                  Avez vous un espace disponible chez vous ?
                  <span>Une cour, une parcelle, ou un petit terrain</span>
                </p>
                <div className="qualifier__opts">
                  {[
                    "Oui, j'ai de l'espace",
                    'Je ne suis pas sûr(e)',
                    'Pas pour l’instant',
                  ].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`qualifier__opt${qSelected['1'] === label ? ' is-selected' : ''}`}
                      onClick={() => onQualifier('1', label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="qualifier__panel" hidden={qPanel !== '2'}>
                <p className="qualifier__q">
                  Avez vous déjà une activité économique aujourd hui ?
                  <span>Commerce, entreprise, ou autre</span>
                </p>
                <div className="qualifier__opts">
                  {['Oui', 'Pas encore'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`qualifier__opt${qSelected['2'] === label ? ' is-selected' : ''}`}
                      onClick={() => onQualifier('2', label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="qualifier__panel" hidden={qPanel !== 'result'}>
                <p className="qualifier__reassurance">{reassurance}</p>
                <a
                  href={waUrl(qualifierWaMsg)}
                  className="btn btn--on-dark btn--lg btn--block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discuter avec notre équipe <i className="fa-brands fa-whatsapp" />
                </a>
              </div>
              <div className="qualifier__progress">
                <span className={`dot${qPanel === '1' ? ' is-active' : ''}`} />
                <span className={`dot${qPanel === '2' ? ' is-active' : ''}`} />
                <span className={`dot${qPanel === 'result' ? ' is-active' : ''}`} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div>
              <div className="footer__logo">
                <img src={LOGO} alt="Rapido" />
              </div>
              <p className="footer__tagline">
                Producteur et installateur de bassins d&apos;élevage de poisson au Bénin. Livraison,
                installation et accompagnement.
              </p>
            </div>
            <div>
              <h4>Contact</h4>
              <ul>
                <li>
                  <i className="fa-brands fa-whatsapp" /> {WA_DISPLAY}
                </li>
                <li>
                  <i className="fa-solid fa-location-dot" /> Cotonou, Bénin
                </li>
              </ul>
            </div>
            <div>
              <h4>Liens</h4>
              <ul>
                <li>
                  <SectionLink to="#solution">Le bassin</SectionLink>
                </li>
                <li>
                  <SectionLink to="#offre">L&apos;offre</SectionLink>
                </li>
                <li>
                  <SectionLink to="#avis">Avis clients</SectionLink>
                </li>
                <li>
                  <SectionLink to="#faq">Questions fréquentes</SectionLink>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© 2026 Rapido  Élevage de poisson au Bénin.</span>
            <span>Les résultats varient selon l&apos;exploitation et ne sont pas garantis.</span>
          </div>
        </div>
      </footer>

      <div className={`sticky-bar${stickyVisible ? ' is-visible' : ''}`} id="stickyBar">
        <div className="sticky-bar__price">
          670 000 FCFA<small>Bassin + installation</small>
        </div>
        <Link to={BASSINS_FORM_PATH} className="btn btn--on-dark btn--sm">
          Réserver
        </Link>
      </div>
    </div>
  );
}

export default BassinsPage;
