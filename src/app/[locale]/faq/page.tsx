import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    question: "Quel est le délai de fabrication pour une enseigne personnalisée ?",
    answer: "Comptez généralement 7 à 14 jours ouvrés entre la validation de votre design et l'expédition.",
  },
  {
    question: "Quelle taille maximale pour une enseigne personnalisée ?",
    answer: "Les enseignes personnalisées sont limitées à 90cm de largeur et 90cm de hauteur.",
  },
  {
    question: "Que se passe-t-il si mon tracé contient des collisions ?",
    answer: "Le configurateur détecte automatiquement les zones où deux tubes néon seraient trop proches et vous propose des ajustements avant de valider la commande.",
  },
  {
    question: "Livrez-vous en dehors de l'Algérie ?",
    answer: "Oui, la livraison internationale est disponible via transporteur, les délais varient selon la destination.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">Questions fréquentes</h1>
      <Accordion multiple={false}>
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
