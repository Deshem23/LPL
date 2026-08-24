export const metadata = {
  title: "Conditions d'utilisation - Les Pages Libres",
  description:
    "Les règles d'utilisation de Les Pages Libres, pour les visiteurs comme pour les comptes contributeur, rédacteur, éditeur et administrateur.",
};

// Previously four short English placeholder paragraphs. Expanded to
// actually reflect how this platform works: public visitors reading
// content, versus registered accounts (contributor / writer / editor /
// admin) that can submit or publish articles through an editorial
// review workflow.
export default async function TermsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const lastUpdated = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-6">Conditions d&apos;utilisation</h1>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p>Dernière mise à jour : {lastUpdated}</p>

        <p>
          Les présentes conditions régissent l&apos;accès et l&apos;utilisation du site Les Pages Libres
          (« la plateforme »), édité depuis Delmas 75, Port-au-Prince, Haïti. En consultant le
          site ou en créant un compte, vous acceptez ces conditions.
        </p>

        <h2>1. Qui est concerné</h2>
        <p>
          Ces conditions s&apos;appliquent à toute personne consultant le site (« visiteur »), ainsi
          qu&apos;aux titulaires d&apos;un compte, quel que soit leur rôle : contributeur, rédacteur
          (« writer »), éditeur ou administrateur. Certaines sections ne concernent que les
          comptes enregistrés ; elles sont indiquées comme telles.
        </p>

        <h2>2. Accès au contenu</h2>
        <p>
          La lecture des articles publiés sur Les Pages Libres est libre et gratuite. Nous nous
          efforçons de maintenir le site accessible en permanence, mais ne garantissons pas une
          disponibilité ininterrompue : des interruptions peuvent survenir pour maintenance ou
          pour des raisons indépendantes de notre volonté.
        </p>

        <h2>3. Création et sécurité du compte</h2>
        <p>
          Pour proposer ou publier des articles, un compte est nécessaire. Vous vous engagez à
          fournir des informations exactes lors de votre inscription et à garder votre mot de
          passe confidentiel. Vous êtes responsable de toute activité effectuée depuis votre
          compte ; contactez-nous immédiatement si vous suspectez un accès non autorisé.
        </p>

        <h2>4. Soumission et publication d&apos;articles</h2>
        <p>
          Les contributeurs et rédacteurs peuvent soumettre des articles, qui passent par un
          processus de relecture éditoriale avant publication. Les éditeurs et administrateurs
          sont responsables de la validation, de la modification ou du refus des contenus
          soumis. En soumettant un article, vous garantissez :
        </p>
        <ul>
          <li>que vous en êtes l&apos;auteur ou disposez des droits nécessaires pour le publier ;</li>
          <li>que le contenu n&apos;est pas diffamatoire, trompeur, ni contraire à la loi ;</li>
          <li>que vous respectez les droits d&apos;auteur d&apos;autrui (citations, images, sources).</li>
        </ul>
        <p>
          Nous nous réservons le droit de modifier, refuser ou retirer un contenu qui ne
          respecterait pas ces règles, à tout moment et sans préavis.
        </p>

        <h2>5. Propriété intellectuelle</h2>
        <p>
          Sauf mention contraire, les articles publiés sur Les Pages Libres restent la
          propriété de leurs auteurs respectifs, qui accordent à la plateforme le droit de les
          publier, afficher et distribuer sur le site. La mise en page, le logo et l&apos;identité
          visuelle du site appartiennent à Les Pages Libres. Toute reproduction du contenu du
          site à des fins commerciales sans autorisation est interdite.
        </p>

        <h2>6. Comportement attendu</h2>
        <p>Vous vous engagez à ne pas :</p>
        <ul>
          <li>publier de contenu illégal, haineux, diffamatoire ou trompeur ;</li>
          <li>usurper l&apos;identité d&apos;une autre personne ou organisation ;</li>
          <li>tenter de perturber le fonctionnement technique du site ou d&apos;accéder sans autorisation à des comptes ou données qui ne vous appartiennent pas.</li>
        </ul>

        <h2>7. Suspension et résiliation</h2>
        <p>
          Nous pouvons suspendre ou résilier un compte en cas de non-respect de ces conditions,
          notamment en cas de contenu contraire à la loi ou de comportement portant atteinte au
          site ou à ses utilisateurs. Vous pouvez demander la suppression de votre compte à
          tout moment en nous contactant.
        </p>

        <h2>8. Limitation de responsabilité</h2>
        <p>
          Les articles publiés reflètent les opinions de leurs auteurs et ne représentent pas
          nécessairement la position de Les Pages Libres. Nous mettons tout en œuvre pour
          assurer l&apos;exactitude des informations publiées, sans pouvoir garantir l&apos;absence
          totale d&apos;erreurs.
        </p>

        <h2>9. Modification des présentes conditions</h2>
        <p>
          Nous pouvons mettre à jour ces conditions périodiquement. La date de dernière mise à
          jour, en haut de cette page, indique la version en vigueur. Une utilisation continue
          du site après modification vaut acceptation des nouvelles conditions.
        </p>

        <h2>10. Nous contacter</h2>
        <ul>
          <li>E-mail : <a href="mailto:contact.lespageslibres@gmail.com">contact.lespageslibres@gmail.com</a></li>
          <li>Téléphone : <a href="tel:+50941897341">+509 41 89 7341</a></li>
          <li>Adresse : Delmas 75, Port-au-Prince, Haïti</li>
        </ul>
      </div>
    </div>
  );
}
