// Opening Book Database
// Ogni apertura contiene la sequenza di mosse e possibili variazioni

class OpeningBook {
    constructor() {
        /**
         * Database di aperture di scacchi.
         * Formato: FEN normalizzata (prime 4 parti) -> { moves: [mosse possibili], name: "Nome Apertura", eco: "Codice ECO" }
         * Le mosse sono in formato "long algebraic notation" (es. "e2e4").
         */
        this.openings = {
            // Posizione iniziale
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": {
                moves: ["e2e4", "d2d4", "g1f3", "c2c4"],
                name: "Starting Position",
                eco: ""
            },

            // --- APERTURE DI RE (1.e4) ---

            // 1.e4
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3": {
                moves: ["e7e5", "c7c5", "e7e6", "c7c6", "d7d5", "g8f6"],
                name: "King's Pawn Game",
                eco: "B00"
            },

            // Partita Aperta: 1.e4 e5
            "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6": {
                moves: ["g1f3", "f2f4", "b1c3", "f1c4"],
                name: "Open Game",
                eco: "C20"
            },

            // 1.e4 e5 2.Nf3
            "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -": {
                moves: ["b8c6", "g8f6", "d7d6"],
                name: "King's Knight Opening",
                eco: "C40"
            },

            // 1.e4 e5 2.Nf3 Nc6
            "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": {
                moves: ["f1b5", "f1c4", "d2d4", "b1c3"],
                name: "King's Knight Opening after Nc6",
                eco: "C40"
            },

            // Spagnola (Ruy Lopez): 1.e4 e5 2.Nf3 Nc6 3.Bb5
            "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -": {
                moves: ["a7a6", "g8f6", "f7f5", "d7d6"],
                name: "Ruy Lopez",
                eco: "C60"
            },
            // Spagnola, Variante di Cambio: 3...a6 4.Bxc6
            "r1bqkbnr/1ppp1ppp/p1n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": {
                moves: ["f1c4", "d2d4"],
                name: "Ruy Lopez, Morphy Defense",
                eco: "C68"
            },

            // Italiana: 1.e4 e5 2.Nf3 Nc6 3.Bc4
            "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -": {
                moves: ["f8c5", "g8f6", "f8e7"],
                name: "Italian Game",
                eco: "C50"
            },
            // Giuoco Piano: 3...Bc5
            "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -": {
                moves: ["c2c3", "d2d3", "e1g1"],
                name: "Giuoco Piano",
                eco: "C50"
            },

            // Scozzese: 1.e4 e5 2.Nf3 Nc6 3.d4
            "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPPP1PPP/RNBQKB1R b KQkq d3": {
                moves: ["e5d4"],
                name: "Scotch Game",
                eco: "C44"
            },

            // Difesa Petrov: 1.e4 e5 2.Nf3 Nf6
            "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": {
                moves: ["f3e5", "d2d4", "b1c3"],
                name: "Petrov's Defense",
                eco: "C42"
            },

            // Difesa Siciliana: 1.e4 c5
            "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6": {
                moves: ["g1f3", "c2c3", "f2f4", "b1c3"],
                name: "Sicilian Defense",
                eco: "B20"
            },
            // Siciliana Aperta: 1.e4 c5 2.Nf3
            "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -": {
                moves: ["d7d6", "b8c6", "e7e6"],
                name: "Sicilian Defense: Open",
                eco: "B28"
            },
            // Siciliana Najdorf: 2...d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
            "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq -": {
                moves: ["f1e2", "c1g5", "f2f4", "f1c4"],
                name: "Sicilian Defense: Najdorf Variation",
                eco: "B90"
            },

            // Difesa Francese: 1.e4 e6
            "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": {
                moves: ["d2d4", "g1f3"],
                name: "French Defense",
                eco: "C00"
            },
            // Francese: 1.e4 e6 2.d4 d5
            "rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6": {
                moves: ["b1c3", "e4d5", "e4e5"],
                name: "French Defense: Main Line",
                eco: "C01"
            },

            // Difesa Caro-Kann: 1.e4 c6
            "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": {
                moves: ["d2d4", "g1f3"],
                name: "Caro-Kann Defense",
                eco: "B10"
            },
            // Caro-Kann: 1.e4 c6 2.d4 d5
            "rnbqkbnr/ppp2ppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6": {
                moves: ["b1c3", "e4d5", "e4e5"],
                name: "Caro-Kann Defense: Main Line",
                eco: "B12"
            },

            // --- APERTURE DI DONNA (1.d4) ---

            // 1.d4
            "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3": {
                moves: ["g8f6", "d7d5", "e7e6", "f7f5"],
                name: "Queen's Pawn Game",
                eco: "A40"
            },

            // 1.d4 d5
            "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6": {
                moves: ["c2c4", "g1f3"],
                name: "Queen's Pawn Game: Symmetrical",
                eco: "D00"
            },

            // Gambetto di Donna: 1.d4 d5 2.c4
            "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3": {
                moves: ["e7e6", "c7c6", "d5c4", "g8f6"],
                name: "Queen's Gambit",
                eco: "D06"
            },
            // Gambetto di Donna Rifiutato (QGD): 2...e6
            "rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -": {
                moves: ["b1c3", "g1f3"],
                name: "Queen's Gambit Declined",
                eco: "D30"
            },
            // Difesa Slava: 2...c6
            "rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -": {
                moves: ["g1f3", "b1c3"],
                name: "Slav Defense",
                eco: "D10"
            },

            // Difese Indiane: 1.d4 Nf6
            "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": {
                moves: ["c2c4", "g1f3"],
                name: "Indian Game",
                eco: "A45"
            },
            // 1.d4 Nf6 2.c4
            "rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3": {
                moves: ["e7e6", "g7g6", "c7c5"],
                name: "Indian Game: Main Line",
                eco: "A46"
            },
            // Difesa Nimzo-Indiana: 2...e6 3.Nc3 Bb4
            "rnbqkb1r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -": {
                moves: ["e2e3", "d1c2", "f2f3"],
                name: "Nimzo-Indian Defense",
                eco: "E20"
            },
            // Difesa Est-Indiana (King's Indian): 2...g6 3.Nc3 Bg7
            "rnbq1rk1/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQ -": {
                moves: ["e2e4"],
                name: "King's Indian Defense: Main Line",
                eco: "E90"
            },
        };

        this.currentOpening = { name: "Starting Position", eco: "" };
    }

    /**
     * Normalizza una stringa FEN conservando solo le prime 4 parti,
     * rendendola ideale per le ricerche nel libro di aperture.
     * @param {string} fen - La stringa FEN completa.
     * @returns {string} La FEN normalizzata.
     */
    normalizeFEN(fen) {
        return fen.split(' ').slice(0, 4).join(' ');
    }

    /**
     * Ottiene le mosse del libro per la posizione corrente.
     * @param {string} fen - La FEN della posizione attuale.
     * @returns {string[]} Un array di mosse possibili o un array vuoto.
     */
    getOpeningMoves(fen) {
        const normalizedFen = this.normalizeFEN(fen);
        const opening = this.openings[normalizedFen];

        if (opening) {
            this.currentOpening = { name: opening.name, eco: opening.eco };
            return opening.moves || [];
        }

        // Se la posizione non è nel libro, usciamo dalla teoria
        // Potremmo voler mantenere l'ultimo nome di apertura noto
        return [];
    }

    /**
     * Sceglie una mossa casuale dal libro per la posizione data.
     * @param {string} fen - La FEN della posizione attuale.
     * @returns {string|null} Una mossa o null se non si è nel libro.
     */
    getRandomOpeningMove(fen) {
        const moves = this.getOpeningMoves(fen);
        if (moves.length > 0) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        return null;
    }

    getCurrentOpeningName() {
        return this.currentOpening.name;
    }

    getCurrentOpeningECO() {
        return this.currentOpening.eco;
    }

    /**
     * Controlla se una data posizione è presente nel libro di aperture.
     * @param {string} fen - La FEN della posizione attuale.
     * @returns {boolean}
     */
    isInOpeningBook(fen) {
        const normalizedFen = this.normalizeFEN(fen);
        return this.openings.hasOwnProperty(normalizedFen);
    }

    /**
     * Debug method to see what moves are available for a position
     * @param {string} fen - The FEN of the current position
     */
    debugPosition(fen) {
        const normalizedFen = this.normalizeFEN(fen);
        const opening = this.openings[normalizedFen];
        console.log('Debug position:', {
            fen: fen,
            normalizedFen: normalizedFen,
            inBook: !!opening,
            opening: opening,
            availableMoves: opening ? opening.moves : []
        });
    }

    reset() {
        this.currentOpening = { name: "Starting Position", eco: "" };
    }
}

// Esporta la classe per l'uso, ad esempio in un file principale.
// Se usi moduli ES6: export default OpeningBook;
// Altrimenti per il browser:
if (typeof window !== 'undefined') {
    window.OpeningBook = OpeningBook;
}
