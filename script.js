// ==========================================================
// Quiz Web - Partie JavaScript
// Fonctionnalités :
//  - chronomètre par question (compte à rebours)
//  - score avec pénalités temporelles
//  - feedback immédiat (bonne / mauvaise réponse)
//  - meilleurs scores sauvegardés (localStorage)
//  - bonus : rejouer avec reset complet, QCM et Vrai/Faux,
//            barre de progression, transition entre questions
// ==========================================================

// ---------- Réglages ----------
const DUREE = 15;          // secondes par question
const POINTS_MAX = 10;     // points pour une bonne réponse
const PENALITE_TOUTES = 3; // -1 point toutes les 3 secondes
const CLE_SCORES = "quizweb-meilleurs-scores";

// ---------- Questions (type "qcm" ou "vraifaux") ----------
const questions = [
    {
        type: "qcm",
        question: "Que signifie HTML ?",
        choix: ["HyperText Markup Language", "High Text Machine Language", "Home Tool Markup Language", "Hyper Tool Main Language"],
        bonne: 0
    },
    {
        type: "vraifaux",
        question: "La balise <img> doit avoir un attribut alt.",
        bonne: true
    },
    {
        type: "qcm",
        question: "Quelle propriété CSS change la couleur du texte ?",
        choix: ["font-color", "color", "text-color", "background"],
        bonne: 1
    },
    {
        type: "vraifaux",
        question: "En CSS, display: grid active Flexbox.",
        bonne: false
    },
    {
        type: "qcm",
        question: "Quel mot-clé déclare une constante en JavaScript ?",
        choix: ["var", "let", "fixed", "const"],
        bonne: 3
    },
    {
        type: "vraifaux",
        question: "localStorage garde les données après la fermeture du navigateur.",
        bonne: true
    }
];

// ---------- Classe Quiz : toute la logique du jeu ----------
class Quiz {
    constructor(listeQuestions) {
        this.questions = listeQuestions;
        this.reinitialiser();
    }

    // Remet tout à zéro (utilisé au démarrage et pour rejouer)
    reinitialiser() {
        clearInterval(this.minuteur);
        this.index = 0;
        this.score = 0;
        this.tempsRestant = DUREE;
        this.minuteur = null;
        this.repondu = false;
    }

    questionActuelle() {
        return this.questions[this.index];
    }

    // Les choix affichés selon le type de question
    choixActuels() {
        const q = this.questionActuelle();
        return q.type === "vraifaux" ? ["Vrai", "Faux"] : q.choix;
    }

    // Index du bon choix (pour Vrai/Faux : 0 = Vrai, 1 = Faux)
    indexBonneReponse() {
        const q = this.questionActuelle();
        if (q.type === "vraifaux") {
            return q.bonne ? 0 : 1;
        }
        return q.bonne;
    }

    // Points gagnés : 10 moins 1 point toutes les 3 secondes écoulées
    calculerPoints() {
        const tempsEcoule = DUREE - this.tempsRestant;
        const penalite = Math.floor(tempsEcoule / PENALITE_TOUTES);
        return Math.max(0, POINTS_MAX - penalite);
    }

    // Vérifie un choix et renvoie les points gagnés (-1 = temps écoulé)
    verifier(choix) {
        this.repondu = true;
        clearInterval(this.minuteur);
        if (choix === this.indexBonneReponse()) {
            const points = this.calculerPoints();
            this.score += points;
            return points;
        }
        return 0;
    }

    estTermine() {
        return this.index >= this.questions.length;
    }

    scoreMax() {
        return this.questions.length * POINTS_MAX;
    }
}

// ---------- Meilleurs scores (localStorage) ----------
function lireMeilleursScores() {
    try {
        return JSON.parse(localStorage.getItem(CLE_SCORES)) || [];
    } catch (erreur) {
        return [];
    }
}

// Ajoute le score, garde les 5 meilleurs, et indique si c'est un record
function sauvegarderScore(score) {
    const scores = lireMeilleursScores();
    const record = scores.length === 0 || score > scores[0].score;
    scores.push({ score: score, date: new Date().toLocaleDateString("fr-FR") });
    scores.sort(function (a, b) { return b.score - a.score; });
    try {
        localStorage.setItem(CLE_SCORES, JSON.stringify(scores.slice(0, 5)));
    } catch (erreur) {
        // stockage indisponible : on continue sans sauvegarder
    }
    return record;
}

function afficherMeilleursScores(liste) {
    const scores = lireMeilleursScores();
    liste.innerHTML = "";
    if (scores.length === 0) {
        liste.innerHTML = "<li>Aucun score pour le moment.</li>";
        return;
    }
    scores.forEach(function (s) {
        const li = document.createElement("li");
        li.textContent = s.score + " points - " + s.date;
        liste.appendChild(li);
    });
}

// ---------- Éléments de la page ----------
const accueil = document.getElementById("accueil");
const ecranQuiz = document.getElementById("quiz");
const resultat = document.getElementById("resultat");
const numero = document.getElementById("numero");
const chrono = document.getElementById("chrono");
const scoreTexte = document.getElementById("score");
const progression = document.getElementById("progression");
const barre = document.getElementById("barre");
const questionTexte = document.getElementById("question");
const reponses = document.getElementById("reponses");
const feedback = document.getElementById("feedback");
const btnSuivant = document.getElementById("btn-suivant");
const scoreFinal = document.getElementById("score-final");
const messageRecord = document.getElementById("message-record");

const quiz = new Quiz(questions);

// ---------- Affichage ----------

// Démarre ou redémarre le quiz (reset complet)
function commencer() {
    quiz.reinitialiser();
    scoreTexte.textContent = "0";
    accueil.hidden = true;
    resultat.hidden = true;
    ecranQuiz.hidden = false;
    afficherQuestion();
}

function afficherQuestion() {
    numero.textContent = "Question " + (quiz.index + 1) + " / " + quiz.questions.length;
    questionTexte.textContent = quiz.questionActuelle().question;
    feedback.textContent = "";
    feedback.className = "";
    btnSuivant.hidden = true;
    mettreAJourProgression();

    // Création des boutons de réponse
    reponses.innerHTML = "";
    reponses.className = "reponses";
    if (quiz.questionActuelle().type === "vraifaux") {
        reponses.classList.add("vraifaux");
    }
    quiz.choixActuels().forEach(function (texte, i) {
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.textContent = texte;
        bouton.addEventListener("click", function () {
            repondre(i);
        });
        reponses.appendChild(bouton);
    });

    // Animation de transition : on relance la classe CSS
    ecranQuiz.classList.remove("transition");
    void ecranQuiz.offsetWidth;
    ecranQuiz.classList.add("transition");

    lancerChrono();
}

// Compte à rebours avec setInterval
function lancerChrono() {
    quiz.tempsRestant = DUREE;
    afficherChrono();
    quiz.minuteur = setInterval(function () {
        quiz.tempsRestant--;
        afficherChrono();
        if (quiz.tempsRestant <= 0) {
            repondre(-1); // temps écoulé
        }
    }, 1000);
}

function afficherChrono() {
    chrono.textContent = quiz.tempsRestant + " s";
    chrono.classList.toggle("urgent", quiz.tempsRestant <= 5);
}

function mettreAJourProgression() {
    const pourcentage = Math.round((quiz.index / quiz.questions.length) * 100);
    barre.style.width = pourcentage + "%";
    progression.setAttribute("aria-valuenow", pourcentage);
}

// Feedback immédiat après une réponse
function repondre(choix) {
    if (quiz.repondu) {
        return;
    }
    const points = quiz.verifier(choix);
    const bonIndex = quiz.indexBonneReponse();
    const boutons = reponses.querySelectorAll("button");

    boutons.forEach(function (b) {
        b.disabled = true;
    });
    boutons[bonIndex].classList.add("correct");

    if (choix === bonIndex) {
        feedback.textContent = "Bonne réponse ! +" + points + " points";
        feedback.className = "correct";
    } else if (choix === -1) {
        feedback.textContent = "Temps écoulé ! 0 point";
        feedback.className = "faux";
    } else {
        boutons[choix].classList.add("faux");
        feedback.textContent = "Mauvaise réponse. 0 point";
        feedback.className = "faux";
    }

    scoreTexte.textContent = quiz.score;
    btnSuivant.hidden = false;
    btnSuivant.focus();
}

function suivant() {
    quiz.index++;
    quiz.repondu = false;
    if (quiz.estTermine()) {
        afficherResultat();
    } else {
        afficherQuestion();
    }
}

function afficherResultat() {
    mettreAJourProgression();
    ecranQuiz.hidden = true;
    resultat.hidden = false;
    scoreFinal.textContent = quiz.score + " / " + quiz.scoreMax();

    const record = sauvegarderScore(quiz.score);
    messageRecord.textContent = record ? "Nouveau record !" : "";
    afficherMeilleursScores(document.getElementById("meilleurs-resultat"));
}

// ---------- Événements ----------
document.getElementById("btn-commencer").addEventListener("click", commencer);
document.getElementById("btn-rejouer").addEventListener("click", commencer);
btnSuivant.addEventListener("click", suivant);

afficherMeilleursScores(document.getElementById("meilleurs-accueil"));
