import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function GET() {
  try {
    // Température à 0.8 pour forcer la créativité et la variabilité
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
      generationConfig: { 
        temperature: 0.8, 
        responseMimeType: "application/json" 
      } 
    })

    const prompt = `Tu es un recruteur expert du HCP (Haut-Commissariat au Plan) au Maroc. 
Ta mission est de générer une liste de 7 questions d'entretien UNIQUES et ALÉATOIRES pour un candidat au poste d'enquêteur terrain.

CONTRAINTES STRICTES :
1. Ne pose jamais les mêmes questions d'une session à l'autre. Varie les angles et les mises en situation.
2. Le candidat doit faire face à des situations concrètes du terrain (refus de répondre, quartiers difficiles, utilisation de tablettes, respect du secret statistique).
3. 5 questions doivent être de type "texte" et 2 de type "oral" (pour tester la communication parlée).

Retourne UNIQUEMENT un tableau JSON valide avec cette structure exacte (sans texte avant ou après) :
[
  {
    "id": 1,
    "type": "texte", // ou "oral"
    "categorie": "HCP", // ex: Communication, Informatique, Patience, Terrain, Confidentialité
    "question": "Votre question ici...",
    "consigne": "Une courte consigne pour aider le candidat (ex: Répondez en 3 phrases, ou Cliquez sur le micro)"
  }
]`

    const result = await model.generateContent(prompt)
    const questionsText = result.response.text()
    
    // On parse le JSON garanti par responseMimeType
    const questions = JSON.parse(questionsText)

    return NextResponse.json(questions)

  } catch (err: any) {
    console.error('Erreur lors de la génération des questions:', err)
    
    // Fallback de sécurité : si Gemini échoue, on renvoie une liste par défaut pour ne pas bloquer l'UI
    const fallbackQuestions = [
      { id: 1, type: 'texte', categorie: 'Secours', question: "Pourquoi souhaitez-vous rejoindre le HCP ?", consigne: "Répondez brièvement." },
      { id: 2, type: 'oral', categorie: 'Communication', question: "Présentez-vous brièvement.", consigne: "Utilisez le micro." }
    ]
    return NextResponse.json(fallbackQuestions, { status: 200 }) // On renvoie 200 avec le fallback pour que l'app continue de tourner
  }
}