// data/surveyTemplates.js
// Templates prédéfinis pour les 3 types de sondages.
// L'admin peut modifier / supprimer des questions avant publication.

const surveyTemplates = {
  // ──────────────────────────────────────────────────────────────────────────
  //  1. DISPONIBILITÉ
  // ──────────────────────────────────────────────────────────────────────────
  disponibilite: {
    titre:       'Sondage de disponibilité',
    description: 'Indiquez vos disponibilités pour la prochaine répétition ou événement.',
    type:        'disponibilite',
    questions: [
      {
        id:          'q1',
        texte:       'Quelles dates vous conviennent ?',
        type:        'checkbox',
        obligatoire: true,
        // Les options de dates seront générées dynamiquement par l'admin
        options: [],
      },
      {
        id:          'q2',
        texte:       'Quel créneau horaire préférez-vous ?',
        type:        'radio',
        obligatoire: true,
        options: [
          { valeur: 'matin',  label: 'Matin (9h – 12h)'       },
          { valeur: 'apmidi', label: 'Après-midi (14h – 18h)' },
          { valeur: 'soir',   label: 'Soir (19h – 21h)'       },
        ],
      },
      {
        id:          'q3',
        texte:       'Commentaire ou contrainte particulière',
        type:        'texte',
        obligatoire: false,
        options:     [],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  2. VOYAGE
  // ──────────────────────────────────────────────────────────────────────────
  voyage: {
    titre:       'Sondage de voyage',
    description: 'Aidez-nous à organiser le prochain voyage du chœur.',
    type:        'voyage',
    questions: [
      {
        id:          'q1',
        texte:       'Quelle destination souhaitez-vous ?',
        type:        'select',
        obligatoire: true,
        options: [
          { valeur: 'rome',     label: 'Rome, Italie'        },
          { valeur: 'paris',    label: 'Paris, France'       },
          { valeur: 'vienne',   label: 'Vienne, Autriche'   },
          { valeur: 'madrid',   label: 'Madrid, Espagne'     },
          { valeur: 'lisbonne', label: 'Lisbonne, Portugal'  },
          { valeur: 'autre',    label: 'Autre (préciser en commentaire)' },
        ],
      },
      {
        id:          'q2',
        texte:       'Quel type d\'hébergement préférez-vous ?',
        type:        'radio',
        obligatoire: true,
        options: [
          { valeur: 'hotel',   label: 'Hôtel'          },
          { valeur: 'auberge', label: 'Auberge de jeunesse' },
          { valeur: 'airbnb',  label: 'Airbnb / Location' },
        ],
      },
      {
        id:          'q3',
        texte:       'Quel est votre budget approximatif par personne (hors transport) ?',
        type:        'select',
        obligatoire: true,
        options: [
          { valeur: 'moins_200',   label: 'Moins de 200 TND'       },
          { valeur: '200_500',     label: 'Entre 200 et 500 TND'   },
          { valeur: '500_1000',    label: 'Entre 500 et 1 000 TND' },
          { valeur: 'plus_1000',   label: 'Plus de 1 000 TND'      },
        ],
      },
      {
        id:          'q4',
        texte:       'Avez-vous un régime alimentaire particulier ?',
        type:        'checkbox',
        obligatoire: false,
        options: [
          { valeur: 'vegetarien', label: 'Végétarien'   },
          { valeur: 'vegan',      label: 'Vegan'        },
          { valeur: 'halal',      label: 'Halal'        },
          { valeur: 'sans_gluten',label: 'Sans gluten'  },
          { valeur: 'aucun',      label: 'Aucun régime' },
        ],
      },
      {
        id:          'q5',
        texte:       'Remarques ou demandes spéciales',
        type:        'texte',
        obligatoire: false,
        options:     [],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  3. RESTAURANT
  // ──────────────────────────────────────────────────────────────────────────
  restaurant: {
    titre:       'Sondage de sortie restaurant',
    description: 'Aidez-nous à choisir le restaurant idéal pour notre prochaine sortie.',
    type:        'restaurant',
    questions: [
      {
        id:          'q1',
        texte:       'Quels types de cuisine vous plaisent ?',
        type:        'checkbox',
        obligatoire: true,
        options: [
          { valeur: 'tunisien',    label: 'Tunisien'      },
          { valeur: 'italien',     label: 'Italien'       },
          { valeur: 'francais',    label: 'Français'      },
          { valeur: 'oriental',    label: 'Oriental'      },
          { valeur: 'japonais',    label: 'Japonais'      },
          { valeur: 'grill',       label: 'Grillades'     },
          { valeur: 'vegetarien',  label: 'Végétarien'    },
          { valeur: 'autre',       label: 'Autre'         },
        ],
      },
      {
        id:          'q2',
        texte:       'Avez-vous des allergies alimentaires ? (si oui, précisez)',
        type:        'texte',
        obligatoire: false,
        options:     [],
      },
      {
        id:          'q3',
        texte:       'Quel quartier préférez-vous ?',
        type:        'radio',
        obligatoire: false,
        options: [
          { valeur: 'centre_ville', label: 'Centre-ville'   },
          { valeur: 'la_marsa',     label: 'La Marsa'       },
          { valeur: 'sidi_bou',     label: 'Sidi Bou Saïd'  },
          { valeur: 'lac',          label: 'Les Lacs'       },
          { valeur: 'indifferent',  label: 'Peu importe'    },
        ],
      },
      {
        id:          'q4',
        texte:       'Quel(s) jour(s) vous conviendraient ?',
        type:        'checkbox',
        obligatoire: true,
        options: [
          { valeur: 'lundi',    label: 'Lundi'    },
          { valeur: 'mardi',    label: 'Mardi'    },
          { valeur: 'mercredi', label: 'Mercredi' },
          { valeur: 'jeudi',    label: 'Jeudi'    },
          { valeur: 'vendredi', label: 'Vendredi' },
          { valeur: 'samedi',   label: 'Samedi'   },
          { valeur: 'dimanche', label: 'Dimanche' },
        ],
      },
      {
        id:          'q5',
        texte:       'Taille de groupe souhaitée pour votre table ?',
        type:        'radio',
        obligatoire: false,
        options: [
          { valeur: '2_4',   label: '2 à 4 personnes'   },
          { valeur: '5_8',   label: '5 à 8 personnes'    },
          { valeur: '9_plus',label: '9 personnes ou plus'},
        ],
      },
    ],
  },
};

export default surveyTemplates;
