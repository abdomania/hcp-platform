import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from '@react-pdf/renderer'

// Police système universelle
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    padding: '20mm 15mm',
    color: '#1a1a1a',
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottom: '1.5pt solid #000',
    paddingBottom: 8,
  },
  headerLeft: { width: '40%' },
  headerRight: { width: '58%', textAlign: 'right' },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#003366' },
  companySlogan: { fontSize: 7, color: '#555', marginTop: 2 },
  addressText: { fontSize: 7, color: '#333', lineHeight: 1.5 },
  contractTitle: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#003366',
    color: '#fff',
    padding: '6 0',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  partiesBox: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  partieCol: {
    flex: 1,
    border: '0.5pt solid #999',
    padding: 6,
    borderRadius: 3,
  },
  partieTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#003366',
    marginBottom: 4,
    borderBottom: '0.5pt solid #ccc',
    paddingBottom: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  fieldLabel: { width: 90, fontSize: 7.5, color: '#555' },
  fieldValue: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    borderBottom: '0.5pt solid #333',
    paddingBottom: 1,
  },
  preamble: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 6,
    color: '#003366',
  },
  article: { marginBottom: 5 },
  articleTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#003366',
    marginBottom: 2,
  },
  articleText: { fontSize: 7.5, lineHeight: 1.5 },
  highlightedText: {
    fontFamily: 'Helvetica-Bold',
    color: '#003366',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTop: '0.5pt solid #ccc',
    paddingTop: 10,
  },
  signatureBlock: { width: '45%', alignItems: 'center' },
  signatureLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
    color: '#003366',
  },
  signatureLine: {
    borderTop: '0.5pt solid #333',
    width: '80%',
    marginTop: 5,
  },
  signatureNote: { fontSize: 6.5, color: '#777', marginTop: 3 },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 15,
    right: 15,
    textAlign: 'center',
    fontSize: 6.5,
    color: '#aaa',
    borderTop: '0.5pt solid #eee',
    paddingTop: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  col: { flex: 1 },
})

export type ContratData = {
  prenom: string
  nom: string
  email: string
  telephone?: string
  adresse: string
  cin?: string
  cnss?: string
  poste_titre: string
  date_generation: string
}

function ContratDocument({ data }: { data: ContratData }) {
  return (
    <Document
      title={`Contrat de mission — ${data.prenom} ${data.nom}`}
      author="Haut-Commissariat au Plan (HCP)"
      subject="Contrat à durée déterminée — Mission Enquêteur"
    >
      <Page size="A4" style={S.page}>

        {/* En-tête */}
        <View style={S.headerRow}>
          <View style={S.headerLeft}>
            <Text style={S.companyName}>3STD</Text>
            <Text style={S.companySlogan}>Intérim · Placement · Travail Temporaire</Text>
            <Text style={[S.addressText, { marginTop: 4 }]}>
              Bureau 5, Étage 1, Lot 39 Champs de Course{'\n'}
              30000 (V.N.) FÈS — Maroc{'\n'}
              Tél : 06 61 35 58 10 — Fax : 05 35 94 02 33{'\n'}
              R.C. : 24745 — I.C.E. : 001451282000088{'\n'}
              I.F. : 4510858 — T.P. : 13613200 — C.N.S.S. : 6936308{'\n'}
              RIB BP : 127 270 212 11977635 90001 82
            </Text>
          </View>
          <View style={S.headerRight}>
            <Text style={[S.addressText, { textAlign: 'right' }]}>
              Généré le : {data.date_generation}{'\n'}
              Réf. contrat : DS01/2026/DS
            </Text>
          </View>
        </View>

        {/* Titre */}
        <Text style={S.contractTitle}>
          CONTRAT À DURÉE DÉTERMINÉE POUR L'EXÉCUTION D'UNE MISSION
        </Text>

        {/* Parties */}
        <View style={S.partiesBox}>
          <View style={S.partieCol}>
            <Text style={S.partieTitle}>Entre Société 3STD — D'une part :</Text>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Société :</Text>
              <Text style={S.fieldValue}>3STD — Société de Travail Temporaire</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Siège social :</Text>
              <Text style={S.fieldValue}>Bureau 5 Étage 1, Lot 39, Fès — Maroc</Text>
            </View>
          </View>
          <View style={S.partieCol}>
            <Text style={S.partieTitle}>Et le Salarié — D'autre part :</Text>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Prénom :</Text>
              <Text style={S.fieldValue}>{data.prenom}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Nom :</Text>
              <Text style={S.fieldValue}>{data.nom}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Adresse :</Text>
              <Text style={S.fieldValue}>{data.adresse}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Email :</Text>
              <Text style={S.fieldValue}>{data.email}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Téléphone :</Text>
              <Text style={S.fieldValue}>{data.telephone || 'À compléter'}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>C.I.N. :</Text>
              <Text style={S.fieldValue}>{data.cin || 'À compléter'}</Text>
            </View>
            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>C.N.S.S. :</Text>
              <Text style={S.fieldValue}>{data.cnss || 'À compléter'}</Text>
            </View>
          </View>
        </View>

        <Text style={S.preamble}>
          Il a été convenu et accepté ce qui suit :
        </Text>

        {/* Articles — 2 colonnes */}
        <View style={S.twoCol}>
          <View style={S.col}>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 1</Text>
              <Text style={S.articleText}>
                L'employé est informé que la société STD3 est une société de placement et de travail temporaire. Son activité est temporaire par nature et nécessite des travailleurs pour des périodes limitées afin d'accomplir des tâches spécifiques auprès de sociétés ou d'administrations publiques en tant qu'employeur. L'employé a pris connaissance du règlement intérieur de la société et s'est engagé à en respecter les dispositions.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 2</Text>
              <Text style={S.articleText}>
                L'employé est affecté à titre temporaire pour accomplir une mission déterminée en qualité d'
                <Text style={S.highlightedText}>ENQUÊTEUR</Text>
                {' '}auprès de l'employeur :{' '}
                <Text style={S.highlightedText}>Haut-Commissariat au Plan (HCP) — المندوبية السامية للتخطيط</Text>.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 3</Text>
              <Text style={S.articleText}>
                Ce contrat est un contrat de mission temporaire, lié à la validité de la commande n°{' '}
                <Text style={S.highlightedText}>DS01/2026/DS</Text>
                {' '}et selon les besoins de l'établissement employeur.{'\n'}
                Il débute le{' '}
                <Text style={S.highlightedText}>01/03/2026</Text>
                {' '}et se termine le{' '}
                <Text style={S.highlightedText}>28/02/2027</Text>.{'\n'}
                Sauf cas de sanctions disciplinaires ou de résiliation à l'initiative de l'employeur, l'employé s'engage à travailler pour la société pendant toute la durée du contrat.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 4</Text>
              <Text style={S.articleText}>
                La période d'essai est fixée à un mois et demi à compter de l'entrée en vigueur du contrat. Elle peut être renouvelée une fois pour la même durée, avec information préalable de l'employé. Les deux parties ont le droit de résilier ce contrat à tout moment pendant la période d'essai si l'employé s'avère inapte à la fonction, sans indemnités.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 5</Text>
              <Text style={S.articleText}>
                L'employé peut être amené à exercer ses fonctions dans n'importe quelle région du territoire national, son affectation n'étant pas liée à un lieu précis. Tout changement de lieu de travail n'entraîne aucune modification du salaire convenu. Les deux parties considèrent cette clause importante et contraignante.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 6</Text>
              <Text style={S.articleText}>
                L'employé s'engage à respecter les horaires de travail définis par la direction de la société STD3 ou par l'employeur. Il s'engage également à travailler en dehors de ces horaires, le week-end, les jours fériés nationaux et religieux, de nuit ou de jour, si l'employeur ou la société l'exige.
              </Text>
            </View>

          </View>

          <View style={S.col}>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 7 — Rémunération</Text>
              <Text style={S.articleText}>
                L'employé perçoit un salaire journalier net de{' '}
                <Text style={S.highlightedText}>140,00 MAD</Text>
                {' '}ainsi qu'une indemnité de déplacement de{' '}
                <Text style={S.highlightedText}>120,00 MAD</Text>
                {' '}net par déplacement, selon les émargements visés par l'employeur.{'\n'}
                Le nombre d'heures convenu peut être réduit si les circonstances l'exigent.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 8</Text>
              <Text style={S.articleText}>
                L'employé engage sa responsabilité personnelle pour toute négligence ou imprudence dans l'exercice de ses fonctions. Il s'engage sous sa responsabilité à conserver en bon état les outils, machines et vêtements mis à sa disposition. En cas de détérioration, perte ou non-restitution, la valeur sera déduite de ses droits.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 9</Text>
              <Text style={S.articleText}>
                La société se réserve le droit de résilier ce contrat en cas de : faute grave de l'employé, force majeure, ou instruction de l'employeur (insuffisance de rendement, travail mal exécuté). En cas de résiliation, l'employé ne peut réclamer aucune indemnité de préavis, de licenciement ou de dommages. L'employeur est seul décideur de la durée de la mission.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 10</Text>
              <Text style={S.articleText}>
                L'employé déclare être libre de tout engagement vis-à-vis de tout employeur précédent. Il s'engage à informer l'administration par écrit, sous 48 heures, de tout changement concernant sa situation familiale, son adresse ou ses coordonnées personnelles, sous peine de considérer cela comme une faute grave.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 11</Text>
              <Text style={S.articleText}>
                L'employé peut soumettre une démission avec signature légalisée ou une quittance avec signature légalisée, ce qui suffit à mettre fin au contrat de travail et à dégager la société de toutes ses obligations, sans besoin d'aucune autre procédure. L'employé ne peut revenir sur cet acte une fois remis volontairement à la société.
              </Text>
            </View>

            <View style={S.article}>
              <Text style={S.articleTitle}>Article 12 — Juridiction compétente</Text>
              <Text style={S.articleText}>
                En cas de litige entre les parties, pendant ou après la relation de travail, les tribunaux de{' '}
                <Text style={S.highlightedText}>Fès</Text>
                {' '}sont seuls compétents pour statuer sur ce litige. L'employé accepte cette clause volontairement.
              </Text>
            </View>

            <Text style={[S.articleText, { marginTop: 6, fontFamily: 'Helvetica-Bold', fontSize: 7 }]}>
              Ce contrat est établi en deux exemplaires, dont un est remis à l'employé.
            </Text>

          </View>
        </View>

        {/* Signatures */}
        <View style={S.signatureRow}>
          <View style={S.signatureBlock}>
            <Text style={S.signatureLabel}>Pour la Société 3STD</Text>
            <View style={S.signatureLine} />
            <Text style={S.signatureNote}>Signature et cachet de la société</Text>
          </View>
          <View style={S.signatureBlock}>
            <Text style={S.signatureLabel}>
              Le Salarié — {data.prenom} {data.nom}
            </Text>
            <View style={S.signatureLine} />
            <Text style={S.signatureNote}>Signature légalisée de l'employé</Text>
          </View>
        </View>

        {/* Pied de page */}
        <Text style={S.footer}>
          Contrat généré automatiquement par la Plateforme HCP · {data.date_generation} · Poste : {data.poste_titre}
        </Text>

      </Page>
    </Document>
  )
}

export async function genererContratPDF(data: ContratData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ContratDocument data={data} />)
  return Buffer.from(buffer)
}
