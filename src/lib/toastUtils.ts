import { useStore } from '../store/useStore';

const PAPA_JOKES = [
  "Bravo Papa, action réussie ! Heureusement que ton fils Vincent est un génie pour t'offrir ça.",
  "Action enregistrée ! Normalement ça coûte 1000 euros, mais c'est cadeau de la part de Vincent.",
  "Une opération de plus gérée d'une main de maître ! Vincent a vraiment bien codé ce truc.",
  "Succès ! Pense à remercier Vincent à l'occasion, son cerveau fonctionne à 200%.",
  "Parfait papa. N'oublie pas que chaque clic ici te fait économiser des heures... Merci Vincent !",
  "Wow, tu maîtrises l'appli ! C'est sûr que quand le développeur s'appelle Vincent, tout est plus facile.",
  "Enregistré avec succès ! Une opération réussie, c'est 100 euros pour Vincent en plus normalement.",
  "C'est dans la boîte ! Allez, avoue que ton fils est un génie de l'informatique.",
  "Modification appliquée. Vincent t'offre encore une fonctionnalité premium gratuitement.",
  "Base de données mise à jour ! Vincent s'assure que tes affaires roulent parfaitement.",
  "Bravo Papa pour cette action ! On dit merci qui ? Merci Vincent le prodige.",
  "Action validée ! N'oublie pas de glisser un petit billet à Vincent pour le SAV exceptionnel.",
  "Hop, c'est sauvegardé ! Ton fils a vraiment créé une machine de guerre immobilière.",
  "Validation réussie ! Cette application est la preuve que Vincent a hérité de ton bon sens (et plus encore).",
  "Action complétée ! Si cette app était payante, tu serais le meilleur client de Vincent.",
  "Tout est bon Papa ! Vincent a mis des heures à coder ça pour que ça glisse comme sur des roulettes.",
  "Félicitations pour cette action ! Pense à payer un bon resto à Vincent pour le remercier.",
  "C'est fait ! La rumeur dit que Vincent a programmé cette fonctionnalité d'une seule main...",
  "Bingo ! C'est enregistré. Heureusement que le petit prodige de la famille gère le code.",
  "Une action de génie, exécutée sur une plateforme de génie créée par Vincent. La classe !"
];

export const triggerSuccessToast = (userEmail: string | undefined, defaultMsg: string = "Action effectuée avec succès.") => {
  if (userEmail === 'sd@familleducastel.com') {
    const randomJoke = PAPA_JOKES[Math.floor(Math.random() * PAPA_JOKES.length)];
    useStore.getState().setToastMessage(`👑 ${randomJoke}`);
  } else {
    useStore.getState().setToastMessage(`✅ ${defaultMsg}`);
  }
};
