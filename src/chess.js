class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.playerColor = 'white'; // 'white' or 'black', for PVC mode
        this.selectedSquare = null;
        this.gameState = 'playing';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        this.enPassantTarget = null;

        this.pieceSymbols = {
            white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
            black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
        };

        this.gameMode = 'pvp'; // 'pvp' or 'pvc'
        this.aiDifficulty = 10; // Stockfish depth
        this.stockfish = new Worker('stockfish.js');
        this.isAITurn = false;
        this.analysisPanelVisible = false;
        this.currentAnalysis = "";
        this.showAIAssist = false; // Added
        this.thinkingArrowSVG = null; // Added to store the thinking arrow SVG element

        // Initialize opening book
        this.openingBook = new OpeningBook();

        this.initializeDOM();
        this.renderBoard();
        this.updateGameInfo();
        this.setupStockfish();
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Set up pawns
        for (let col = 0; col < 8; col++) {
            board[1][col] = { type: 'pawn', color: 'black' };
            board[6][col] = { type: 'pawn', color: 'white' };
        }

        // Set up other pieces
        const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: backRank[col], color: 'black' };
            board[7][col] = { type: backRank[col], color: 'white' };
        }

        return board;
    }

    initializeDOM() {
        this.boardElement = document.getElementById('chessBoard');
        this.currentPlayerElement = document.getElementById('currentPlayer');
        this.gameStatusElement = document.getElementById('gameStatus');
        this.currentOpeningElement = document.getElementById('currentOpening');
        this.moveListElement = document.getElementById('moveList');
        this.whiteCapturedElement = document.getElementById('whiteCaptured');
        this.blackCapturedElement = document.getElementById('blackCaptured');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.resignBtn = document.getElementById('resignBtn');
        this.offerDrawBtn = document.getElementById('offerDrawBtn');
        this.toggleAnalysisBtn = document.getElementById('toggleAnalysisBtn');
        this.analysisPanel = document.getElementById('analysisPanel');
        this.analysisOutput = document.getElementById('analysisOutput');
        this.closeAnalysisBtn = document.getElementById('closeAnalysisBtn'); // Added
        this.promotionModal = document.getElementById('promotionModal');
        this.gameModeSelect = document.getElementById('gameMode');
        this.aiDifficultySelect = document.getElementById('aiDifficulty');
        this.aiDifficultySetting = document.getElementById('aiDifficultySetting');
        this.showAIAssistCheckbox = document.getElementById('showAIAssistArrow');
        this.aiAssistContainer = document.getElementById('showAIAssistContainer');

        // Checkmate Modal elements
        this.checkmateModal = document.getElementById('checkmateModal');
        this.checkmateMessageElement = document.getElementById('checkmateMessage');
        this.closeCheckmateModalBtn = document.getElementById('closeCheckmateModalBtn');

        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.undoBtn.addEventListener('click', () => this.undoMove());
        this.resignBtn.addEventListener('click', () => this.resignGame());
        this.offerDrawBtn.addEventListener('click', () => this.offerDraw());
        this.toggleAnalysisBtn.addEventListener('click', () => this.toggleAnalysisPanel());
        if (this.closeAnalysisBtn) { // Add event listener for the new close button
            this.closeAnalysisBtn.addEventListener('click', () => this.toggleAnalysisPanel(false));
        }
        if (this.closeCheckmateModalBtn) {
            this.closeCheckmateModalBtn.addEventListener('click', () => this.hideCheckmateModal());
        }
        this.gameModeSelect.addEventListener('change', (e) => this.setGameMode(e.target.value));
        this.aiDifficultySelect.addEventListener('change', (e) => this.setAIDifficulty(parseInt(e.target.value)));
        if (this.showAIAssistCheckbox) { // Added event listener for the new checkbox
            this.showAIAssistCheckbox.addEventListener('change', (e) => {
                this.showAIAssist = e.target.checked;
                if (!this.showAIAssist) {
                    this.removeThinkingArrow(); // Remove arrow if checkbox is unchecked
                }
            });
        }

        // Promotion modal event listeners
        document.querySelectorAll('.promotion-piece').forEach(button => {
            button.addEventListener('click', () => this.handlePromotion(button.dataset.piece));
        });
    }

    renderBoard() {
        this.boardElement.innerHTML = ''; // Clear previous board

        // Add SVG defs for arrowheads if not already present
        if (!document.getElementById('arrowhead')) {
            const svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgDefs.style.position = 'absolute';
            svgDefs.style.width = '0';
            svgDefs.style.height = '0';
            svgDefs.innerHTML = `
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 0, 0, 0.7)" />
                    </marker>
                    <marker id="arrowhead-thinking" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 165, 0, 0.6)" />
                    </marker>
                </defs>
            `;
            this.boardElement.appendChild(svgDefs);
        }

        for (let row = 0; row < 8; row++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'board-row';

            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = this.pieceSymbols[piece.color][piece.type];
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                rowElement.appendChild(square);
            }

            this.boardElement.appendChild(rowElement);
        }
    }

    handleSquareClick(row, col) {
        if (this.isAITurn && this.gameMode === 'pvc') return; // Prevent player moves during AI turn
        if (this.gameState !== 'playing' && this.gameState !== 'check') return;

        const clickedSquare = { row, col };
        const piece = this.board[row][col];

        if (this.selectedSquare) {
            if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
                // Deselect the same square
                this.clearSelection();
            } else if (this.isValidMove(this.selectedSquare, clickedSquare)) {
                this.makeMove(this.selectedSquare, clickedSquare);
            } else if (piece && piece.color === this.currentPlayer) {
                // Select a different piece of the same color
                this.selectSquare(clickedSquare);
            } else {
                this.clearSelection();
            }
        } else {
            if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(clickedSquare);
            }
        }
    }

    selectSquare(square) {
        this.selectedSquare = square;
        this.highlightSquares();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.clearHighlights();
    }

    highlightSquares() {
        this.clearHighlights();

        if (!this.selectedSquare) return;

        const selectedElement = document.querySelector(`[data-row="${this.selectedSquare.row}"][data-col="${this.selectedSquare.col}"]`);
        selectedElement.classList.add('selected');

        const validMoves = this.getValidMoves(this.selectedSquare);
        validMoves.forEach(move => {
            const element = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (this.board[move.row][move.col]) {
                element.classList.add('capture-move');
            } else {
                element.classList.add('valid-move');
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'capture-move', 'in-check');
        });
    }

    getValidMoves(from) {
        const piece = this.board[from.row][from.col];
        if (!piece) return [];

        let moves = [];

        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(from, piece.color);
                break;
            case 'rook':
                moves = this.getRookMoves(from);
                break;
            case 'knight':
                moves = this.getKnightMoves(from);
                break;
            case 'bishop':
                moves = this.getBishopMoves(from);
                break;
            case 'queen':
                moves = this.getQueenMoves(from);
                break;
            case 'king':
                moves = this.getKingMoves(from);
                break;
        }

        // Filter out moves that would put own king in check
        return moves.filter(to => !this.wouldBeInCheckAfterMove(from, to));
    }

    getPawnMoves(from, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const { row, col } = from;

        // Forward move
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({ row: row + direction, col });

            // Double move from start position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }

        // Captures
        [-1, 1].forEach(deltaCol => {
            const newRow = row + direction;
            const newCol = col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (targetPiece && targetPiece.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }

                // En passant
                if (this.enPassantTarget &&
                    this.enPassantTarget.row === newRow &&
                    this.enPassantTarget.col === newCol) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    getRookMoves(from) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        directions.forEach(([deltaRow, deltaCol]) => {
            moves.push(...this.getMovesInDirection(from, deltaRow, deltaCol));
        });

        return moves;
    }

    getBishopMoves(from) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        directions.forEach(([deltaRow, deltaCol]) => {
            moves.push(...this.getMovesInDirection(from, deltaRow, deltaCol));
        });

        return moves;
    }

    getQueenMoves(from) {
        return [...this.getRookMoves(from), ...this.getBishopMoves(from)];
    }

    getKnightMoves(from) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([deltaRow, deltaCol]) => {
            const newRow = from.row + deltaRow;
            const newCol = from.col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.board[from.row][from.col].color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    getKingMoves(from) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([deltaRow, deltaCol]) => {
            const newRow = from.row + deltaRow;
            const newCol = from.col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.board[from.row][from.col].color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        // Castling
        const color = this.board[from.row][from.col].color;
        if (!this.hasKingMoved[color] && !this.isInCheck(color)) {
            // Kingside castling
            if (!this.hasRookMoved[color].kingside &&
                !this.board[from.row][5] && !this.board[from.row][6] &&
                !this.isSquareAttacked(from.row, 5, color) &&
                !this.isSquareAttacked(from.row, 6, color)) {
                moves.push({ row: from.row, col: 6 });
            }

            // Queenside castling
            if (!this.hasRookMoved[color].queenside &&
                !this.board[from.row][1] && !this.board[from.row][2] && !this.board[from.row][3] &&
                !this.isSquareAttacked(from.row, 2, color) &&
                !this.isSquareAttacked(from.row, 3, color)) {
                moves.push({ row: from.row, col: 2 });
            }
        }

        return moves;
    }

    getMovesInDirection(from, deltaRow, deltaCol) {
        const moves = [];
        const piece = this.board[from.row][from.col];
        let row = from.row + deltaRow;
        let col = from.col + deltaCol;

        while (this.isInBounds(row, col)) {
            const targetPiece = this.board[row][col];

            if (!targetPiece) {
                moves.push({ row, col });
            } else {
                if (targetPiece.color !== piece.color) {
                    moves.push({ row, col });
                }
                break;
            }

            row += deltaRow;
            col += deltaCol;
        }

        return moves;
    }

    isValidMove(from, to) {
        const validMoves = this.getValidMoves(from);
        return validMoves.some(move => move.row === to.row && move.col === to.col);
    }

    makeMove(from, to) {
        const piece = this.board[from.row][from.col];
        const capturedPiece = this.board[to.row][to.col];

        // Store state for undo
        const previousState = {
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            playerColor: this.playerColor, // Store player color for undo in PVC
            gameState: this.gameState,
            capturedPieces: JSON.parse(JSON.stringify(this.capturedPieces)),
            hasKingMoved: JSON.parse(JSON.stringify(this.hasKingMoved)),
            hasRookMoved: JSON.parse(JSON.stringify(this.hasRookMoved)),
            enPassantTarget: this.enPassantTarget,
            moveHistoryLength: this.moveHistory.length // To truncate move history display
        };
        this.moveHistory.push({ from, to, piece, capturedPiece, previousState });

        // Actual move logic
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Handle castling - move the rook
        if (piece.type === 'king') {
            this.hasKingMoved[piece.color] = true;
            // Kingside castling
            if (to.col - from.col === 2) {
                this.board[from.row][5] = this.board[from.row][7];
                this.board[from.row][7] = null;
                this.hasRookMoved[piece.color].kingside = true;
            }
            // Queenside castling
            if (to.col - from.col === -2) {
                this.board[from.row][3] = this.board[from.row][0];
                this.board[from.row][0] = null;
                this.hasRookMoved[piece.color].queenside = true;
            }
        }

        // Update rook moved status
        if (piece.type === 'rook') {
            if (from.col === 0 && from.row === (piece.color === 'white' ? 7 : 0)) {
                this.hasRookMoved[piece.color].queenside = true;
            }
            if (from.col === 7 && from.row === (piece.color === 'white' ? 7 : 0)) {
                this.hasRookMoved[piece.color].kingside = true;
            }
        }

        // Handle pawn promotion
        if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
            this.showPromotionModal(to, piece.color);
            // The actual promotion is handled by handlePromotion
            // For now, we pause the game flow here until promotion is chosen
            return; // Important: exit makeMove until promotion is handled
        }

        // Handle en passant capture
        if (piece.type === 'pawn' && this.enPassantTarget && to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            const enPassantCapturedPiece = this.board[capturedPawnRow][to.col];
            if (enPassantCapturedPiece) {
                this.capturedPieces[this.currentPlayer].push(enPassantCapturedPiece);
                this.board[capturedPawnRow][to.col] = null;
            }
        }

        // Set new en passant target if a pawn moves two squares
        if (piece.type === 'pawn' && Math.abs(from.row - to.row) === 2) {
            this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col, color: piece.color };
        } else {
            this.enPassantTarget = null;
        }

        if (capturedPiece) {
            this.capturedPieces[this.currentPlayer].push(capturedPiece);
        }

        this.clearSelection();
        this.renderBoard();
        this.switchPlayer();
        this.updateGameInfo();
        this.updateOpeningInfo(); // Update opening information after move
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.checkGameEnd();

        this.undoBtn.disabled = false;

        if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor && (this.gameState === 'playing' || this.gameState === 'check')) {
            this.isAITurn = true;
            this.gameStatusElement.textContent = 'AI is thinking...'; // Indicate AI is thinking
            this.requestAIMove();
        }
    }

    showPromotionModal() {
        this.promotionModal.style.display = 'flex';
    }

    handlePromotion(pieceType, isAIMove = false) {
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        if (!lastMove || !this.board[lastMove.to.row][lastMove.to.col] || this.board[lastMove.to.row][lastMove.to.col].type !== 'pawn') {
            console.error('Promotion error: Last move not a pawn promotion.');
            if (!isAIMove) this.promotionModal.style.display = 'none';
            return;
        }

        const pawn = this.board[lastMove.to.row][lastMove.to.col];
        this.board[lastMove.to.row][lastMove.to.col] = { type: pieceType, color: pawn.color };

        if (!isAIMove) {
            this.promotionModal.style.display = 'none';
            this.clearSelection();
            this.renderBoard();
            this.switchPlayer(); // Player was switched before promotion modal for player, switch again for AI
            this.updateGameInfo();
            this.updateOpeningInfo(); // Update opening info after promotion
            this.updateMoveHistory(); // Update with promoted piece
            this.updateCapturedPieces();
            this.checkGameEnd();

            if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor && (this.gameState === 'playing' || this.gameState === 'check')) {
                this.isAITurn = true;
                this.gameStatusElement.textContent = 'AI is thinking...';
                this.requestAIMove();
            }
        } else {
            // AI promotion is part of its move, board already rendered, player switched.
            // Just need to ensure game state is consistent.
            this.renderBoard(); // Re-render to show promoted piece from AI
            this.updateGameInfo();
            this.updateOpeningInfo(); // Update opening info after AI promotion
            this.updateMoveHistory();
            this.checkGameEnd();
        }
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;

        const lastMove = this.moveHistory.pop();
        const { previousState } = lastMove;

        this.board = JSON.parse(JSON.stringify(previousState.board));
        this.currentPlayer = previousState.currentPlayer;
        this.playerColor = previousState.playerColor;
        this.gameState = previousState.gameState;
        this.capturedPieces = JSON.parse(JSON.stringify(previousState.capturedPieces));
        this.hasKingMoved = JSON.parse(JSON.stringify(previousState.hasKingMoved));
        this.hasRookMoved = JSON.parse(JSON.stringify(previousState.hasRookMoved));
        this.enPassantTarget = previousState.enPassantTarget;

        // If playing against AI and it was AI's turn to be undone,
        // undo player's previous move as well so player can retry.
        if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor && this.moveHistory.length > 0) {
            const playerMoveToUndo = this.moveHistory.pop();
            const { previousState: playerPreviousState } = playerMoveToUndo;
            this.board = JSON.parse(JSON.stringify(playerPreviousState.board));
            this.currentPlayer = playerPreviousState.currentPlayer;
            this.playerColor = playerPreviousState.playerColor;
            this.gameState = playerPreviousState.gameState;
            this.capturedPieces = JSON.parse(JSON.stringify(playerPreviousState.capturedPieces));
            this.hasKingMoved = JSON.parse(JSON.stringify(playerPreviousState.hasKingMoved));
            this.hasRookMoved = JSON.parse(JSON.stringify(playerPreviousState.hasRookMoved));
            this.enPassantTarget = playerPreviousState.enPassantTarget;
        }
        this.isAITurn = false; // Ensure AI turn is reset

        this.renderBoard();
        this.updateGameInfo();
        this.updateOpeningInfo(); // Update opening info after undo
        this.updateMoveHistory(previousState.moveHistoryLength);
        this.updateCapturedPieces();
        this.clearSelection();
        this.undoBtn.disabled = this.moveHistory.length === 0;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
    }

    wouldBeInCheckAfterMove(from, to) {
        // Make a temporary move
        const originalPiece = this.board[to.row][to.col];
        const movingPiece = this.board[from.row][from.col];

        this.board[to.row][to.col] = movingPiece;
        this.board[from.row][from.col] = null;

        const inCheck = this.isInCheck(movingPiece.color);

        // Restore the board
        this.board[from.row][from.col] = movingPiece;
        this.board[to.row][to.col] = originalPiece;

        return inCheck;
    }

    isInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;

        return this.isSquareAttacked(kingPosition.row, kingPosition.col, color);
    }

    isSquareAttacked(row, col, defendingColor) {
        const attackingColor = defendingColor === 'white' ? 'black' : 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === attackingColor) {
                    const moves = this.getPieceAttackingMoves({ row: r, col: c }, piece);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    getPieceAttackingMoves(from, piece) {
        // Similar to getValidMoves but doesn't check for king safety
        switch (piece.type) {
            case 'pawn':
                return this.getPawnAttackingMoves(from, piece.color);
            case 'rook':
                return this.getRookMoves(from);
            case 'knight':
                return this.getKnightMoves(from);
            case 'bishop':
                return this.getBishopMoves(from);
            case 'queen':
                return this.getQueenMoves(from);
            case 'king':
                return this.getKingAttackingMoves(from);
            default:
                return [];
        }
    }

    getPawnAttackingMoves(from, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const { row, col } = from;

        // Pawn attacks diagonally
        [-1, 1].forEach(deltaCol => {
            const newRow = row + direction;
            const newCol = col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        return moves;
    }

    getKingAttackingMoves(from) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([deltaRow, deltaCol]) => {
            const newRow = from.row + deltaRow;
            const newCol = from.col + deltaCol;

            if (this.isInBounds(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        });

        return moves;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    checkGameEnd() {
        const inCheck = this.isInCheck(this.currentPlayer);
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);
        let gameEnded = false;

        // Clear previous in-check highlights first
        document.querySelectorAll('.square.in-check').forEach(sq => sq.classList.remove('in-check'));

        if (inCheck) {
            this.gameState = 'check';
            const kingPosition = this.findKing(this.currentPlayer);
            if (kingPosition) {
                const kingElement = document.querySelector(`[data-row="${kingPosition.row}"][data-col="${kingPosition.col}"]`);
                if (kingElement) kingElement.classList.add('in-check');
            }

            if (!hasValidMoves) {
                this.gameState = 'checkmate';
                const winner = this.currentPlayer === 'white' ? 'Nero' : 'Bianco';
                this.showCheckmateModal(`Scacco matto! ${winner} vince!`);
                gameEnded = true;
            }
        } else if (!hasValidMoves) {
            this.gameState = 'stalemate';
            this.showCheckmateModal('Stallo! Partita patta.'); // Re-use modal for stalemate
            gameEnded = true;
        } else {
            this.gameState = 'playing';
        }
        this.updateGameInfo(); // Update status text based on new gameState
        if (gameEnded) {
            this.disableBoardInteraction();
            this.resignBtn.disabled = true;
            this.offerDrawBtn.disabled = true;
        }
    }

    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const validMoves = this.getValidMoves({ row, col });
                    if (validMoves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    updateGameInfo() {
        const playerText = this.currentPlayer === 'white' ? 'Bianco' : 'Nero';
        this.currentPlayerElement.textContent = `Turno: ${playerText}`;

        let statusText = 'Partita in corso';
        if (this.isAITurn && this.gameMode === 'pvc' && (this.gameState === 'playing' || this.gameState === 'check')) {
            statusText = 'AI is thinking...';
        } else if (this.gameState === 'check') {
            statusText = `${playerText} sotto scacco!`;
        } else if (this.gameState === 'checkmate') {
            const winner = this.currentPlayer === 'white' ? 'Nero' : 'Bianco';
            statusText = `Scacco matto! Vince ${winner}`;
        } else if (this.gameState === 'stalemate') {
            statusText = 'Stallo - Partita patta';
        } else if (this.gameState === 'resigned_white') {
            statusText = 'Bianco ha abbandonato. Nero vince!';
        } else if (this.gameState === 'resigned_black') {
            statusText = 'Nero ha abbandonato. Bianco vince!';
        }

        this.gameStatusElement.textContent = statusText;
    }

    updateOpeningInfo() {
        const currentFen = this.boardToFEN();
        this.openingBook.getOpeningMoves(currentFen); // This updates the current opening info
        const openingName = this.openingBook.getCurrentOpeningName();
        const ecoCode = this.openingBook.getCurrentOpeningECO();

        let displayText = openingName;
        if (ecoCode) {
            displayText += ` (${ecoCode})`;
        }

        console.log(`Opening info updated: ${displayText}`); // Debug log

        if (this.currentOpeningElement) {
            this.currentOpeningElement.textContent = displayText;
        }
    }

    updateMoveHistory() {
        this.moveListElement.innerHTML = '';
        this.moveHistory.forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.className = 'move-item';

            const moveNumber = Math.floor(index / 2) + 1;
            const isWhiteMove = index % 2 === 0;
            const moveNotation = this.getMoveNotation(move);

            if (isWhiteMove) {
                moveElement.textContent = `${moveNumber}. ${moveNotation}`;
            } else {
                moveElement.textContent = `${moveNumber}... ${moveNotation}`;
            }

            this.moveListElement.appendChild(moveElement);
        });

        this.moveListElement.scrollTop = this.moveListElement.scrollHeight;
    }

    // START ADDED algebraicToCoords
    algebraicToCoords(algebraic) {
        if (!algebraic || algebraic.length < 2) {
            console.error("Invalid algebraic notation:", algebraic);
            return null;
        }
        const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = 8 - parseInt(algebraic.substring(1), 10);
        if (isNaN(row) || col < 0 || col > 7 || row < 0 || row > 7) {
            console.error("Failed to parse algebraic notation:", algebraic, "to coords:", { row, col });
            return null;
        }
        return { row, col };
    }
    // END ADDED algebraicToCoords

    // START ADDED boardToFEN
    boardToFEN() {
        let fen = '';
        // 1. Piece placement
        for (let r = 0; r < 8; r++) {
            let emptySquares = 0;
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    if (emptySquares > 0) {
                        fen += emptySquares;
                        emptySquares = 0;
                    }
                    let char = piece.type[0]; // p, r, n, b, q, k
                    if (piece.type === 'knight') char = 'n';
                    fen += (piece.color === 'white') ? char.toUpperCase() : char.toLowerCase();
                } else {
                    emptySquares++;
                }
            }
            if (emptySquares > 0) {
                fen += emptySquares;
            }
            if (r < 7) {
                fen += '/';
            }
        }

        // 2. Active color
        fen += this.currentPlayer === 'white' ? ' w' : ' b';

        // 3. Castling availability
        let castling = '';
        if (!this.hasKingMoved.white) {
            if (!this.hasRookMoved.white.kingside) castling += 'K';
            if (!this.hasRookMoved.white.queenside) castling += 'Q';
        }
        if (!this.hasKingMoved.black) {
            if (!this.hasRookMoved.black.kingside) castling += 'k';
            if (!this.hasRookMoved.black.queenside) castling += 'q';
        }
        fen += castling === '' ? ' -' : ` ${castling}`;

        // 4. En passant target square
        if (this.enPassantTarget) {
            const colChar = String.fromCharCode('a'.charCodeAt(0) + this.enPassantTarget.col);
            // FEN expects rank from 1-8, board is 0-7.
            // If white just moved pawn 2 squares, target is row 2 (rank 6 for black to capture on)
            // If black just moved pawn 2 squares, target is row 5 (rank 3 for white to capture on)
            const rank = this.enPassantTarget.color === 'white' ? 3 : 6; // This is the square the capturing pawn moves TO
            fen += ` ${colChar}${rank}`;
        } else {
            fen += ' -';
        }

        // 5. Halfmove clock (number of halfmoves since last capture or pawn advance)
        // For simplicity, we'll use 0. Stockfish can usually work with this.
        // A more accurate implementation would require tracking this in game logic.
        fen += ' 0';

        // 6. Fullmove number (starts at 1, incremented after Black's move)
        const fullmoveNumber = Math.floor(this.moveHistory.length / 2) + 1;
        fen += ` ${fullmoveNumber}`;

        return fen;
    }
    // END ADDED boardToFEN

    getMoveNotation(move) {
        const { piece, to, capturedPiece, castling, promotion, promotedTo } = move;

        if (castling) {
            return castling.isKingside ? 'O-O' : 'O-O-O';
        }

        let notation = '';

        if (piece.type !== 'pawn') {
            notation += this.pieceSymbols[piece.color][piece.type];
        }

        if (capturedPiece) {
            if (piece.type === 'pawn') {
                notation += String.fromCharCode(97 + move.from.col);
            }
            notation += 'x';
        }

        notation += String.fromCharCode(97 + to.col) + (8 - to.row);

        if (promotion && promotedTo) {
            notation += '=' + this.pieceSymbols[piece.color][promotedTo];
        }

        return notation;
    }

    updateCapturedPieces() {
        this.whiteCapturedElement.innerHTML = '';
        this.blackCapturedElement.innerHTML = '';

        this.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols[piece.color][piece.type];
            this.whiteCapturedElement.appendChild(pieceElement);
        });

        this.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = this.pieceSymbols[piece.color][piece.type];
            this.blackCapturedElement.appendChild(pieceElement);
        });
    }

    newGame() {
        this.board = this.initializeBoard();
        // Randomize starting player in PVC mode
        if (this.gameMode === 'pvc') {
            this.playerColor = Math.random() < 0.5 ? 'white' : 'black';
            this.currentPlayer = 'white'; // Game always starts with white's turn
            console.log(`New PVC game. Player is: ${this.playerColor}. Current turn: ${this.currentPlayer}`);
        } else {
            this.playerColor = 'white'; // Default for PvP or if player is white
            this.currentPlayer = 'white';
        }

        this.selectedSquare = null;
        this.gameState = 'playing';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.hasKingMoved = { white: false, black: false };
        this.hasRookMoved = {
            white: { kingside: false, queenside: false },
            black: { kingside: false, queenside: false }
        };
        this.enPassantTarget = null;

        // Reset opening book
        this.openingBook.reset();

        this.renderBoard();
        this.updateGameInfo();
        this.updateOpeningInfo(); // Initialize opening info for new game
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.clearSelection();
        this.undoBtn.disabled = true;
        this.resignBtn.disabled = false;
        this.offerDrawBtn.disabled = false;

        if (this.gameMode === 'pvc' && this.currentPlayer !== this.playerColor) {
            this.isAITurn = true;
            this.gameStatusElement.textContent = 'AI is thinking...';
            this.requestAIMove();
        } else {
            this.isAITurn = false;
        }
        // Reset Stockfish for the new game
        this.stockfish.postMessage('ucinewgame');
        this.stockfish.postMessage('isready');
        if (this.analysisPanelVisible) {
            this.currentAnalysis = "New game started.\n";
            this.analysisOutput.textContent = this.currentAnalysis;
        }

    }

    resignGame() {
        if (this.gameState === 'playing' || this.gameState === 'check') {
            const resigningPlayer = this.currentPlayer;
            this.gameState = resigningPlayer === 'white' ? 'resigned_white' : 'resigned_black';
            const winner = resigningPlayer === 'white' ? 'Nero' : 'Bianco';
            this.updateGameInfo(); // Update status text first
            this.showCheckmateModal(`${resigningPlayer} ha abbandonato. ${winner} vince!`); // Re-use modal
            this.disableBoardInteraction();
            this.resignBtn.disabled = true;
            this.offerDrawBtn.disabled = true;
        }
    }

    offerDraw() {
        if (this.gameState === 'playing' || this.gameState === 'check') {
            // In a real application, this would send a draw offer to the opponent.
            // For PVC, AI might accept/reject. For PvP, other player would respond.
            // Here, we'll just log it and for PVC, AI will ignore it for now.
            if (this.gameMode === 'pvc') {
                // For now, AI doesn't respond to draw offers.
                this.gameStatusElement.textContent = 'Proposta di patta inviata. L\'AI sta riflettendo...';
                console.log('Draw offered to AI. AI currently ignores it.');
            } else {
                // For PvP, this would require communication with the other player.
                // We can simulate an immediate acceptance for simplicity or a modal for the other player.
                const opponent = this.currentPlayer === 'white' ? 'Nero' : 'Bianco';
                if (confirm(`${this.currentPlayer} propone la patta. ${opponent}, accetti?`)) {
                    this.gameState = 'draw_agreed';
                    this.showCheckmateModal('Patta concordata!');
                    this.disableBoardInteraction();
                    this.resignBtn.disabled = true;
                    this.offerDrawBtn.disabled = true;
                } else {
                    this.gameStatusElement.textContent = 'Proposta di patta rifiutata.';
                }
            }
            this.updateGameInfo();
        }
    }

    showCheckmateModal(message) {
        if (this.checkmateModal && this.checkmateMessageElement) {
            this.checkmateMessageElement.textContent = message;
            this.checkmateModal.style.display = 'flex';
        }
    }

    hideCheckmateModal() {
        if (this.checkmateModal) {
            this.checkmateModal.style.display = 'none';
        }
    }

    toggleAnalysisPanel(show) {
        if (show === undefined) {
            this.analysisPanelVisible = !this.analysisPanelVisible;
        } else {
            this.analysisPanelVisible = show;
        }
        this.analysisPanel.style.display = this.analysisPanelVisible ? 'block' : 'none';
        this.toggleAnalysisBtn.textContent = this.analysisPanelVisible ? 'Hide Analysis' : 'Show Analysis';
        if (this.analysisPanelVisible) {
            this.currentAnalysis = "Stockfish Analysis Panel Activated.\n";
            this.analysisOutput.textContent = this.currentAnalysis;
            // Optionally, start analysis immediately if it's a player's turn
            if (this.gameMode === 'pvc' && this.currentPlayer === this.playerColor && (this.gameState === 'playing' || this.gameState === 'check')) {
                this.requestAnalysisForCurrentPosition();
            }
        } else {
            // Stop ongoing analysis if panel is hidden
            this.stockfish.postMessage('stop');
        }
    }

    requestAnalysisForCurrentPosition() {
        if (!this.analysisPanelVisible || (this.gameState !== 'playing' && this.gameState !== 'check')) return;
        this.gameStatusElement.textContent = 'Analyzing position...'; // Update status
        const fen = this.boardToFEN();
        this.currentAnalysis = `Requesting analysis for FEN: ${fen}\n`;
        this.analysisOutput.textContent = this.currentAnalysis;
        this.stockfish.postMessage(`position fen ${fen}`);
        this.stockfish.postMessage(`go depth ${this.aiDifficulty} multipv 3`); // multipv for more lines
    }

    disableBoardInteraction() {
        // This could involve setting a flag or directly disabling event listeners on squares
        // For simplicity, we rely on the gameState checks in handleSquareClick
        this.resignBtn.disabled = true;
        this.offerDrawBtn.disabled = true;
        this.undoBtn.disabled = true; // Usually disable undo after game ends
    }

    // Make sure setAIDifficulty is correctly defined
    setAIDifficulty(difficulty) {
        this.aiDifficulty = difficulty;
        if (this.gameMode === 'pvc' && this.isAITurn) {
            console.log("AI difficulty changed to: ", difficulty);
            // Optionally, you might want to stop current AI thinking and restart with new depth
            // this.stockfish.postMessage('stop');
            // this.requestAIMove(); 
        }
    }

    setGameMode(mode) {
        this.gameMode = mode;
        console.log(`Game mode changed to: ${mode}`);

        if (this.aiDifficultySetting) {
            this.aiDifficultySetting.style.display = mode === 'pvc' ? 'block' : 'none';
        }
        if (this.aiAssistContainer) { // Show/hide AI assist checkbox based on game mode
            this.aiAssistContainer.style.display = mode === 'pvc' ? 'flex' : 'none';
            if (mode !== 'pvc' && this.showAIAssistCheckbox) {
                this.showAIAssistCheckbox.checked = false; // Uncheck if switching from PVC
                this.showAIAssist = false;
                this.removeThinkingArrow();
            }
        }
        this.newGame();
    }

    setupStockfish() {
        this.stockfish.onmessage = (event) => {
            const message = event.data;
            // console.log('Stockfish:', message); 

            if (this.analysisPanelVisible) {
                this.currentAnalysis += message + '\n';
                this.analysisOutput.textContent = this.currentAnalysis;
                this.analysisOutput.scrollTop = this.analysisOutput.scrollHeight; // Auto-scroll
            }

            if (message.startsWith('bestmove')) {
                const move = message.split(' ')[1];
                this.removeThinkingArrow(); // Remove thinking arrow before making the move
                if (this.isAITurn) {
                    this.handleAIMove(move);
                }
            } else if (message.startsWith('info')) {
                if (this.showAIAssist && this.isAITurn) {
                    const parts = message.split(' ');
                    const pvIndex = parts.indexOf('pv');
                    if (pvIndex !== -1 && parts.length > pvIndex + 1) {
                        const contemplatedMoveAlg = parts[pvIndex + 1];
                        this.drawThinkingArrow(contemplatedMoveAlg);
                    }
                }
            }
        };
        this.stockfish.postMessage('uci');
        this.stockfish.postMessage('isready');
        this.stockfish.postMessage('ucinewgame');
    }

    requestAIMove() {
        if (!this.isAITurn || (this.gameState !== 'playing' && this.gameState !== 'check')) return;

        const fen = this.boardToFEN();
        console.log('AI requesting move for FEN:', fen);

        // Debug: Check opening book
        this.openingBook.debugPosition(fen);

        // First, check if we're still in the opening book
        const openingMove = this.openingBook.getRandomOpeningMove(fen);

        if (openingMove) {
            // We're still in opening book, use the opening move
            console.log(`AI using opening book move: ${openingMove}`);
            this.gameStatusElement.textContent = 'AI playing from opening book...';
            this.updateOpeningInfo(); // Update opening display

            // Add a small delay to simulate thinking, then make the move
            setTimeout(() => {
                this.handleAIMove(openingMove);
            }, 500);
        } else {
            // We're out of opening book, use Stockfish
            console.log('AI out of opening book, using Stockfish');
            this.gameStatusElement.textContent = 'AI is thinking...';
            this.stockfish.postMessage(`position fen ${fen}`);
            const depth = this.aiDifficulty;
            this.stockfish.postMessage(`go depth ${depth}`);
        }
    }

    handleAIMove(algebraicMove) {
        this.removeThinkingArrow(); // Ensure arrow is removed
        if (!this.isAITurn) return;

        console.log(`AI proposes move: ${algebraicMove}`);
        const fromAlg = algebraicMove.substring(0, 2);
        const toAlg = algebraicMove.substring(2, 4);
        const promotionPieceType = algebraicMove.length === 5 ? algebraicMove.substring(4, 5) : null;

        const from = this.algebraicToCoords(fromAlg);
        const to = this.algebraicToCoords(toAlg);

        if (!from || !to) {
            console.error('Invalid algebraic move from AI:', algebraicMove);
            this.isAITurn = false; // Reset AI turn
            this.updateGameInfo();
            return;
        }

        const piece = this.board[from.row][from.col];
        if (!piece || piece.color === this.playerColor) {
            console.error('AI tried to move an invalid piece or player\'s piece:', algebraicMove, piece);
            this.isAITurn = false;
            this.updateGameInfo();
            return;
        }

        // Simulate makeMove without triggering another AI move immediately
        const capturedPiece = this.board[to.row][to.col];
        const previousState = { // Simplified state for AI move, undo will handle full restoration
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            gameState: this.gameState,
            capturedPieces: JSON.parse(JSON.stringify(this.capturedPieces)),
            hasKingMoved: JSON.parse(JSON.stringify(this.hasKingMoved)),
            hasRookMoved: JSON.parse(JSON.stringify(this.hasRookMoved)),
            enPassantTarget: this.enPassantTarget,
            moveHistoryLength: this.moveHistory.length
        };
        this.moveHistory.push({ from, to, piece, capturedPiece, previousState, algebraic: algebraicMove });


        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Handle castling for AI
        if (piece.type === 'king') {
            this.hasKingMoved[piece.color] = true;
            if (to.col - from.col === 2) { // Kingside
                this.board[from.row][5] = this.board[from.row][7];
                this.board[from.row][7] = null;
                this.hasRookMoved[piece.color].kingside = true;
            } else if (to.col - from.col === -2) { // Queenside
                this.board[from.row][3] = this.board[from.row][0];
                this.board[from.row][0] = null;
                this.hasRookMoved[piece.color].queenside = true;
            }
        }
        if (piece.type === 'rook') {
            if (from.col === 0 && from.row === (piece.color === 'white' ? 7 : 0)) this.hasRookMoved[piece.color].queenside = true;
            if (from.col === 7 && from.row === (piece.color === 'white' ? 7 : 0)) this.hasRookMoved[piece.color].kingside = true;
        }


        // Handle AI pawn promotion
        if (promotionPieceType) {
            const promotedPiece = promotionPieceType === 'q' ? 'queen' :
                promotionPieceType === 'r' ? 'rook' :
                    promotionPieceType === 'b' ? 'bishop' :
                        promotionPieceType === 'n' ? 'knight' : 'queen'; // Default to queen
            this.board[to.row][to.col] = { type: promotedPiece, color: piece.color };
            // Update move history with promotion info for AI
            this.moveHistory[this.moveHistory.length - 1].promotion = true;
            this.moveHistory[this.moveHistory.length - 1].promotedTo = promotedPiece;
        }

        // Handle en passant capture for AI
        if (piece.type === 'pawn' && this.enPassantTarget && to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            const enPassantCapturedPiece = this.board[capturedPawnRow][to.col];
            if (enPassantCapturedPiece) {
                this.capturedPieces[this.currentPlayer].push(enPassantCapturedPiece); // AI is current player here
                this.board[capturedPawnRow][to.col] = null;
            }
        }

        // Set new en passant target if AI pawn moves two squares
        if (piece.type === 'pawn' && Math.abs(from.row - to.row) === 2) {
            this.enPassantTarget = { row: (from.row + to.row) / 2, col: from.col, color: piece.color };
        } else {
            this.enPassantTarget = null;
        }


        if (capturedPiece) {
            this.capturedPieces[this.currentPlayer].push(capturedPiece); // AI is current player here
        }

        this.isAITurn = false; // AI's turn is over
        this.switchPlayer(); // Switch back to player
        this.renderBoard();
        this.updateGameInfo();
        this.updateOpeningInfo(); // Update opening information after AI move
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.checkGameEnd();
        this.undoBtn.disabled = false;

        // If analysis panel is visible, request analysis for the new position from player's perspective
        if (this.analysisPanelVisible && (this.gameState === 'playing' || this.gameState === 'check')) {
            this.requestAnalysisForCurrentPosition();
        }
    }

    // Helper function to draw the AI's contemplated move arrow
    drawThinkingArrow(algebraicMove) {
        this.removeThinkingArrow(); // Remove any existing arrow first

        if (!algebraicMove || algebraicMove.length < 4) return;

        const fromAlg = algebraicMove.substring(0, 2);
        const toAlg = algebraicMove.substring(2, 4);

        const from = this.algebraicToCoords(fromAlg);
        const to = this.algebraicToCoords(toAlg);

        if (!from || !to) return;

        const fromSquareElement = document.querySelector(`[data-row="${from.row}"][data-col="${from.col}"]`);
        const toSquareElement = document.querySelector(`[data-row="${to.row}"][data-col="${to.col}"]`);

        if (!fromSquareElement || !toSquareElement) return;

        // Get board element positioning info
        const boardStyle = window.getComputedStyle(this.boardElement);
        const squareSize = 60; // Match the CSS square size (60px)
        const boardPadding = parseInt(boardStyle.padding) || 8; // Board padding from CSS

        // Calculate positions relative to the board's content area (excluding padding)
        const x1 = from.col * squareSize + squareSize / 2;
        const y1 = from.row * squareSize + squareSize / 2;
        const x2 = to.col * squareSize + squareSize / 2;
        const y2 = to.row * squareSize + squareSize / 2;

        // Create SVG for the arrow
        const svgNS = "http://www.w3.org/2000/svg";
        this.thinkingArrowSVG = document.createElementNS(svgNS, "svg");
        this.thinkingArrowSVG.classList.add('arrow-thinking');
        this.thinkingArrowSVG.style.position = 'absolute';
        this.thinkingArrowSVG.style.left = boardPadding + 'px';
        this.thinkingArrowSVG.style.top = boardPadding + 'px';
        this.thinkingArrowSVG.style.width = (squareSize * 8) + 'px';
        this.thinkingArrowSVG.style.height = (squareSize * 8) + 'px';
        this.thinkingArrowSVG.style.pointerEvents = 'none';
        this.thinkingArrowSVG.style.zIndex = '10';

        const line = document.createElementNS(svgNS, "line");
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'rgba(255, 165, 0, 0.8)');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('marker-end', 'url(#arrowhead-thinking)');

        this.thinkingArrowSVG.appendChild(line);
        this.boardElement.appendChild(this.thinkingArrowSVG);
    }

    // Helper function to remove the AI's contemplated move arrow
    removeThinkingArrow() {
        if (this.thinkingArrowSVG && this.thinkingArrowSVG.parentNode) {
            this.thinkingArrowSVG.parentNode.removeChild(this.thinkingArrowSVG);
            this.thinkingArrowSVG = null;
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chessGame = new ChessGame();
});
